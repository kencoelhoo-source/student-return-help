import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimModal } from "@/components/ClaimModal";
import { STATUS_COLORS } from "@/lib/constants";
import { ItemCard } from "@/components/ItemCard";
import { MapPin, Calendar, Tag, ArrowLeft, Hand } from "lucide-react";
import { format } from "date-fns";

interface DBItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  status: string;
  date_occurred: string | null;
  created_at: string;
  user_id: string;
}

interface RelatedItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  status: "lost" | "found" | "claimed" | "returned";
  date_occurred: string | null;
  created_at: string;
  image_url: string | null;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<DBItem | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [poster, setPoster] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (id) fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    const { data: itemData } = await supabase.from("items").select("*").eq("id", id!).single();
    if (!itemData) { setLoading(false); return; }
    setItem(itemData);

    const [imagesRes, profileRes, relatedRes] = await Promise.all([
      supabase.from("item_images").select("url").eq("item_id", id!),
      supabase.from("profiles").select("full_name").eq("user_id", itemData.user_id).single(),
      supabase
        .from("items")
        .select("id, title, description, category, location, status, date_occurred, created_at")
        .eq("category", itemData.category)
        .neq("id", id!)
        .limit(4),
    ]);

    setImages(imagesRes.data?.map((i) => i.url) || []);
    setPoster(profileRes.data?.full_name || "Anonymous");

    if (relatedRes.data) {
      const rIds = relatedRes.data.map((i) => i.id);
      const { data: rImages } = await supabase.from("item_images").select("item_id, url").in("item_id", rIds);
      const rMap = new Map<string, string>();
      rImages?.forEach((img) => { if (!rMap.has(img.item_id)) rMap.set(img.item_id, img.url); });
      setRelatedItems(relatedRes.data.map((i) => ({ ...i, image_url: rMap.get(i.id) || null })));
    }
    setLoading(false);
  };

  if (loading) return <div className="container py-12"><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>;
  if (!item) return <div className="container py-12 text-center"><p className="text-lg text-muted-foreground">Item not found.</p></div>;

  const statusStyle = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS];

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/items"><ArrowLeft className="mr-1 h-4 w-4" /> Back to items</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {images.length > 0 ? (
              <img src={images[activeImage]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((url, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 font-semibold`}>{statusStyle.label}</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">{item.title}</h1>
          {item.description && <p className="mt-3 text-muted-foreground leading-relaxed">{item.description}</p>}

          <Card className="mt-6">
            <CardContent className="grid grid-cols-2 gap-4 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{item.location || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{item.date_occurred ? format(new Date(item.date_occurred), "MMM d, yyyy") : "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hand className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Posted by</p>
                  <p className="font-medium">{user?.id === item.user_id ? "You" : poster}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user && user.id !== item.user_id && (item.status === "lost" || item.status === "found") && (
            <Button className="mt-6 w-full bg-gradient-hero" size="lg" onClick={() => setClaimOpen(true)}>
              🙋 This is mine — Claim Item
            </Button>
          )}
          {!user && (
            <Button className="mt-6 w-full" size="lg" variant="outline" asChild>
              <Link to="/auth">Sign in to claim this item</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Related items */}
      {relatedItems.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">Similar Items</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((ri) => <ItemCard key={ri.id} {...ri} />)}
          </div>
        </section>
      )}

      <ClaimModal
        open={claimOpen}
        onOpenChange={setClaimOpen}
        itemId={item.id}
        itemTitle={item.title}
        itemOwnerId={item.user_id}
        onClaimed={fetchItem}
      />
    </div>
  );
}
