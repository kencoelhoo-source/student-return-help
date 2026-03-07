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
  user_id: string;
  message: string;
  status: string;
  verification_question: string | null;
  verification_answer: string | null;
  meeting_requested: boolean;
  meeting_details: string | null;
  appeal_message: string | null;
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
      supabase.from("claims").select("*, items(title, status, user_id)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("claims").select("*, items!inner(title, user_id)").eq("items.user_id", user!.id).order("created_at", { ascending: false }),
    ]);

    setMyItems((itemsRes.data as unknown as DBItem[]) || []);
    setMyClaims((claimsRes.data as unknown as DBClaim[]) || []);
    setNotifications((notifsRes.data as unknown as DBNotification[]) || []);

    const incClaims = (incomingRes.data as unknown as DBClaim[]) || [];
    if (incClaims.length > 0) {
      const userIds = incClaims.map(c => c.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      if (profs) {
        incClaims.forEach(c => {
          const p = profs.find(p => p.user_id === c.user_id);
          if (p) c.profiles = { full_name: p.full_name };
        });
      }
    }
    setIncomingClaims(incClaims);
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

  const handleAction = async (table: "claims" | "notifications" | "items", id: string, payload: any, successMsg: string, notifUserId?: string, notifMsg?: string) => {
    await supabase.from(table).update(payload as any).eq("id", id);
    if (notifUserId && notifMsg) {
      await supabase.from("notifications").insert({
        user_id: notifUserId,
        title: "Claim Update",
        message: notifMsg,
        related_claim_id: table === "claims" ? id : null,
      });
    }
    toast.success(successMsg);
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{claim.items?.title || "Item"}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{claim.message}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{claim.status}</Badge>
                </div>

                {/* Verification Answer Flow */}
                {claim.status === "pending" && claim.verification_question && !claim.verification_answer && !claim.meeting_requested && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Reporter's Question:</p>
                    <p className="text-sm mt-1">"{claim.verification_question}"</p>
                    <div className="mt-3">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const answer = new FormData(e.currentTarget).get("answer") as string;
                        if (!answer.trim()) return;
                        handleAction("claims", claim.id, { verification_answer: answer }, "Answer submitted", claim.items?.user_id, "The claimant answered your verification question.");
                      }}>
                        <textarea name="answer" placeholder="Your answer..." className="w-full text-sm rounded-md border bg-background p-2" rows={2} required />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" type="submit">Submit Answer</Button>
                          <Button size="sm" variant="outline" type="button" onClick={() => handleAction("claims", claim.id, { meeting_requested: true }, "Meeting requested", claim.items?.user_id, "The claimant wants to meet in person to verify.")}>
                            Request to Meet in Person instead
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Waiting for reporter meeting details */}
                {claim.meeting_requested && !claim.meeting_details && (
                  <div className="mt-4 rounded-md border p-3 border-amber-200 bg-amber-50">
                    <p className="text-sm text-amber-800">You requested to meet in person. Waiting for the reporter to suggest a time and place.</p>
                  </div>
                )}

                {/* Showing meeting details */}
                {claim.meeting_requested && claim.meeting_details && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Meeting Details from Reporter:</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{claim.meeting_details}</p>
                  </div>
                )}

                {/* Appeal Flow */}
                {claim.status === "rejected" && !claim.appeal_message && (
                  <div className="mt-4">
                    <p className="text-sm text-destructive mb-2">Claim was rejected. You can appeal by providing more details.</p>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const appeal = new FormData(e.currentTarget).get("appeal") as string;
                        if (!appeal.trim()) return;
                        // For simplicity without changing ENUM, we set status back to pending to trigger re-review
                        handleAction("claims", claim.id, { appeal_message: appeal, status: "pending" }, "Appeal submitted", claim.items?.user_id, "The claimant has submitted an appeal with more details.");
                    }}>
                      <textarea name="appeal" placeholder="Describe in detail where you lost it, defining features, etc." className="w-full text-sm rounded-md border bg-background p-2" rows={3} required />
                      <Button size="sm" type="submit" className="mt-2 w-full">Submit Appeal</Button>
                    </form>
                  </div>
                )}

                {claim.appeal_message && claim.status === "pending" && (
                   <div className="mt-4 rounded-md bg-muted p-3">
                     <p className="text-sm font-medium">Your Appeal:</p>
                     <p className="text-sm mt-1">"{claim.appeal_message}"</p>
                     <p className="text-xs text-muted-foreground mt-2">Waiting for reporter to re-review.</p>
                   </div>
                )}
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Claim on: {claim.items?.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">By: {claim.profiles?.full_name || "Anonymous"}</p>
                  </div>
                  {claim.status !== "pending" && <Badge variant="secondary" className="capitalize">{claim.status}</Badge>}
                </div>
                
                <p className="mt-4 text-sm italic">"{claim.message}"</p>

                {/* Initial pending actions */}
                {claim.status === "pending" && !claim.verification_question && !claim.appeal_message && (
                  <div className="mt-4">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const question = new FormData(e.currentTarget).get("question") as string;
                      if (!question.trim()) return;
                      handleAction("claims", claim.id, { verification_question: question }, "Question sent", claim.user_id, "The reporter has a verification question for you.");
                    }}>
                      <p className="text-sm font-medium mb-1">Verify Ownership (Optional)</p>
                      <div className="flex gap-2">
                        <input name="question" placeholder="e.g., What is the lock screen wallpaper?" className="flex-1 text-sm rounded-md border px-3 py-1" required />
                        <Button size="sm" type="submit" variant="secondary">Ask Question</Button>
                      </div>
                    </form>
                    
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve Claim</Button>
                      <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject</Button>
                    </div>
                  </div>
                )}

                {/* Waiting on claimer to answer */}
                {claim.status === "pending" && claim.verification_question && !claim.verification_answer && !claim.meeting_requested && (
                  <div className="mt-4 rounded-md border p-3 border-blue-200 bg-blue-50">
                    <p className="text-sm text-blue-800">You asked Verification Question: "{claim.verification_question}"</p>
                    <p className="text-xs text-blue-600 mt-1">Waiting for claimant to answer...</p>
                  </div>
                )}

                {/* Claimant answered the question */}
                {claim.status === "pending" && claim.verification_question && claim.verification_answer && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Verification Result</p>
                    <p className="text-sm mt-2 text-muted-foreground">Your Q: {claim.verification_question}</p>
                    <p className="text-sm font-semibold mt-1">Their A: {claim.verification_answer}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject</Button>
                    </div>
                  </div>
                )}

                {/* Claimant requested a meeting */}
                {claim.status === "pending" && claim.meeting_requested && !claim.meeting_details && (
                  <div className="mt-4 rounded-md border p-3 border-amber-200 bg-amber-50">
                    <p className="text-sm font-medium text-amber-800">Claimant wants to meet in person</p>
                    <form className="mt-2" onSubmit={(e) => {
                      e.preventDefault();
                      const details = new FormData(e.currentTarget).get("details") as string;
                      if (!details.trim()) return;
                      handleAction("claims", claim.id, { meeting_details: details }, "Meeting details sent", claim.user_id, "The reporter sent meeting details.");
                    }}>
                      <textarea name="details" placeholder="Where and when? e.g., Library cafe at 3 PM today." className="w-full text-sm rounded-md border bg-background p-2" rows={2} required />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" type="submit">Send Details</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject Claim</Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Meeting details sent wait */}
                {claim.meeting_requested && claim.meeting_details && claim.status === "pending" && (
                   <div className="mt-4 rounded-md bg-muted p-3">
                     <p className="text-sm font-medium">Meeting Setup</p>
                     <p className="text-sm mt-1">You suggested: {claim.meeting_details}</p>
                     <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Mark as Returned (Approve)</Button>
                     </div>
                   </div>
                )}

                {/* Handling Appeals */}
                {claim.status === "pending" && claim.appeal_message && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-bold text-red-800">Appeal from Claimant</p>
                    <p className="text-sm mt-2">"{claim.appeal_message}"</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve Appeal</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        handleAction("claims", claim.id, { status: "rejected" }, "Appeal rejected", claim.user_id, "Your appeal was rejected.");
                      }}>Reject Again</Button>
                    </div>
                  </div>
                )}
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
