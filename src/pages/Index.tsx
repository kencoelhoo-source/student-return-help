import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCard } from "@/components/ItemCard";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowRight, Package, CheckCircle, AlertTriangle } from "lucide-react";
import heroCampus from "@/assets/hero-campus.jpg";

interface ItemWithImage {
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

export default function Index() {
  const [items, setItems] = useState<ItemWithImage[]>([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [itemsRes, statsRes] = await Promise.all([
      supabase
        .from("items")
        .select("id, title, description, category, location, status, date_occurred, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("items").select("status"),
    ]);

    if (itemsRes.data) {
      // Fetch first image for each item
      const ids = itemsRes.data.map((i) => i.id);
      const { data: images } = await supabase
        .from("item_images")
        .select("item_id, url")
        .in("item_id", ids);

      const imageMap = new Map<string, string>();
      images?.forEach((img) => {
        if (!imageMap.has(img.item_id)) imageMap.set(img.item_id, img.url);
      });

      setItems(
        itemsRes.data.map((item) => ({
          ...item,
          status: item.status as ItemWithImage["status"],
          image_url: imageMap.get(item.id) || null,
        }))
      );
    }

    if (statsRes.data) {
      setStats({
        total: statsRes.data.length,
        lost: statsRes.data.filter((i) => i.status === "lost").length,
        found: statsRes.data.filter((i) => i.status === "found").length,
      });
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (search.trim()) {
      window.location.href = `/items?q=${encodeURIComponent(search.trim())}`;
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroCampus} alt="College campus" className="h-full w-full object-cover" />
          <div className="bg-gradient-overlay absolute inset-0" />
        </div>
        <div className="container relative z-10 py-24 md:py-36">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground md:text-6xl animate-fade-in">
              Lost Something on Campus?
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Report lost or found items and help reunite your college community with their belongings.
            </p>
            <div className="mt-8 flex gap-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search for lost items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-card/95 pl-10 backdrop-blur-sm"
                />
              </div>
              <Button onClick={handleSearch} className="bg-gradient-hero hover:opacity-90">Search</Button>
            </div>
            <div className="mt-6 flex justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/post?type=lost">I Lost Something</Link>
              </Button>
              <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/post?type=found">I Found Something</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="container grid grid-cols-3 gap-4 py-8 text-center">
          <div className="animate-count-up">
            <div className="flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-display text-3xl font-bold text-foreground">{stats.total}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Total Items</p>
          </div>
          <div className="animate-count-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-display text-3xl font-bold text-foreground">{stats.lost}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Lost Items</p>
          </div>
          <div className="animate-count-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-display text-3xl font-bold text-foreground">{stats.found}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Found Items</p>
          </div>
        </div>
      </section>

      {/* Recent Items */}
      <section className="container py-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">Recent Items</h2>
          <Button variant="ghost" asChild>
            <Link to="/items">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground">No items posted yet. Be the first!</p>
            <Button className="mt-4 bg-gradient-hero" asChild>
              <Link to="/post">Report an Item</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <ItemCard {...item} image_url={item.image_url} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
