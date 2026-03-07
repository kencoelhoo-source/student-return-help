import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { Bell, Package, Search, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DBItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  user_id?: string;
}

interface DBClaim {
  id: string;
  item_id: string;
  message: string;
  status: string;
  items?: { title: string; user_id?: string; status?: string };
  profiles?: { full_name: string } | null;
}

interface DBNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "my-items";

  const [myItems, setMyItems] = useState<DBItem[]>([]);
  const [myClaims, setMyClaims] = useState<DBClaim[]>([]);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [incomingClaims, setIncomingClaims] = useState<DBClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [itemsRes, claimsRes, notifsRes, incomingRes] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("claims").select("*, items(title, status)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("claims").select("*, items!inner(title, user_id), profiles!claims_user_id_fkey(full_name)").eq("items.user_id", user!.id).order("created_at", { ascending: false }),
    ]);

    setMyItems((itemsRes.data as unknown as DBItem[]) || []);
    setMyClaims((claimsRes.data as unknown as DBClaim[]) || []);
    setNotifications((notifsRes.data as unknown as DBNotification[]) || []);
    setIncomingClaims((incomingRes.data as unknown as DBClaim[]) || []);
    setLoading(false);
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Item deleted"); setMyItems((prev) => prev.filter((i) => i.id !== id)); }
  };

  const updateClaimStatus = async (claimId: string, status: string, itemId: string) => {
    await supabase.from("claims").update({ status: status as never }).eq("id", claimId);
    if (status === "approved") {
      await supabase.from("items").update({ status: "claimed" as never }).eq("id", itemId);
    }
    toast.success(`Claim ${status}`);
    fetchAll();
  };

  if (!user) return null;

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Manage your items, claims, and notifications.</p>

      <Tabs defaultValue={defaultTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-items"><Package className="mr-1 h-4 w-4 hidden sm:block" /> My Items</TabsTrigger>
          <TabsTrigger value="my-claims"><Search className="mr-1 h-4 w-4 hidden sm:block" /> My Claims</TabsTrigger>
          <TabsTrigger value="incoming"><CheckCircle className="mr-1 h-4 w-4 hidden sm:block" /> Incoming</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="mr-1 h-4 w-4 hidden sm:block" /> Alerts
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-items" className="mt-4 space-y-3">
          {loading ? <SkeletonList /> : myItems.length === 0 ? (
            <EmptyState text="You haven't posted any items yet." action={<Button asChild><Link to="/post">Post an Item</Link></Button>} />
          ) : myItems.map((item) => {
            const s = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS];
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Link to={`/items/${item.id}`} className="font-semibold text-foreground hover:underline">{item.title}</Link>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`${s.bg} ${s.text} border-0 text-xs`}>{s.label}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="my-claims" className="mt-4 space-y-3">
          {loading ? <SkeletonList /> : myClaims.length === 0 ? (
            <EmptyState text="You haven't claimed any items yet." />
          ) : myClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="p-4">
                <p className="font-semibold">{claim.items?.title || "Item"}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{claim.message}</p>
                <Badge variant="secondary" className="mt-2 capitalize">{claim.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4 space-y-3">
          {loading ? <SkeletonList /> : incomingClaims.length === 0 ? (
            <EmptyState text="No claims on your items yet." />
          ) : incomingClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="p-4">
                <p className="font-semibold">Claim on: {claim.items?.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">By: {claim.profiles?.full_name || "Anonymous"}</p>
                <p className="mt-1 text-sm italic">"{claim.message}"</p>
                {claim.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject</Button>
                  </div>
                )}
                {claim.status !== "pending" && <Badge variant="secondary" className="mt-2 capitalize">{claim.status}</Badge>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-3">
          {loading ? <SkeletonList /> : notifications.length === 0 ? (
            <EmptyState text="No notifications yet." />
          ) : notifications.map((notif) => (
            <Card key={notif.id} className={notif.read ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{notif.title}</p>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <span className="text-xs text-muted-foreground">{format(new Date(notif.created_at), "MMM d, h:mm a")}</span>
                </div>
                {!notif.read && (
                  <Button variant="ghost" size="sm" onClick={() => markNotifRead(notif.id)}>Mark read</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonList() {
  return <>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</>;
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
