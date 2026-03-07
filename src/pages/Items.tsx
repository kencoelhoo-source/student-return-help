import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ItemCard } from "@/components/ItemCard";
import { SearchFilters } from "@/components/SearchFilters";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Items() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ItemWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchItems();
  }, [keyword, status, category, location]);

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("id, title, description, category, location, status, date_occurred, created_at")
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status as never);
    if (category !== "all") query = query.eq("category", category as never);
    if (location !== "all") query = query.eq("location", location);
    if (keyword.trim()) query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);

    const { data } = await query.limit(50);

    if (data) {
      const ids = data.map((i) => i.id);
      const { data: images } = await supabase.from("item_images").select("item_id, url").in("item_id", ids);
      const imageMap = new Map<string, string>();
      images?.forEach((img) => { if (!imageMap.has(img.item_id)) imageMap.set(img.item_id, img.url); });

      setItems(data.map((item) => ({
        ...item,
        status: item.status as ItemWithImage["status"],
        image_url: imageMap.get(item.id) || null,
      })));
    }
    setLoading(false);
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Browse Items</h1>
        <div className="flex gap-1">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <SearchFilters
          keyword={keyword} onKeywordChange={setKeyword}
          status={status} onStatusChange={setStatus}
          category={category} onCategoryChange={setCategory}
          location={location} onLocationChange={setLocation}
        />
      </div>

      {loading ? (
        <div className={`mt-6 grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-4 text-lg text-muted-foreground">No items found matching your filters.</p>
        </div>
      ) : (
        <div className={`mt-6 grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
          {items.map((item, i) => (
            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
              <ItemCard {...item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
