import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { STATUS_COLORS } from "@/lib/constants";

interface ItemCardProps {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  status: "lost" | "found" | "claimed" | "returned";
  date_occurred: string | null;
  image_url?: string | null;
  created_at: string;
}

export function ItemCard({ id, title, description, category, location, status, date_occurred, image_url, created_at }: ItemCardProps) {
  const statusStyle = STATUS_COLORS[status];

  return (
    <Link to={`/items/${id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image_url ? (
            <img src={image_url} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-4xl">📦</span>
            </div>
          )}
          <Badge className={`absolute left-3 top-3 ${statusStyle.bg} ${statusStyle.text} border-0 font-semibold`}>
            {statusStyle.label}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-display text-lg font-bold leading-tight text-foreground line-clamp-1">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {date_occurred ? format(new Date(date_occurred), "MMM d, yyyy") : format(new Date(created_at), "MMM d, yyyy")}
            </span>
          </div>
          <Badge variant="secondary" className="mt-2 text-xs capitalize">
            {category}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
