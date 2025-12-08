import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, X, Clock, UserPlus } from "lucide-react";

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface JoinRequestsPanelProps {
  groupId: string;
  requests: JoinRequest[];
  profiles: Record<string, { name: string; email: string }>;
  onRequestHandled: () => void;
}

const JoinRequestsPanel = ({
  groupId,
  requests,
  profiles,
  onRequestHandled,
}: JoinRequestsPanelProps) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const handleRequest = async (requestId: string, userId: string, action: "accept" | "reject") => {
    setProcessing(requestId);
    try {
      if (action === "accept") {
        // Add user to group members
        const { error: memberError } = await supabase.from("group_members").insert({
          group_id: groupId,
          user_id: userId,
        });

        if (memberError) throw memberError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("join_requests")
        .update({ status: action === "accept" ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      toast({
        title: action === "accept" ? "Request Accepted" : "Request Rejected",
        description:
          action === "accept"
            ? "The user has been added to the group."
            : "The join request has been rejected.",
      });

      onRequestHandled();
    } catch (error) {
      console.error("Error handling request:", error);
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Join Requests</h3>
        </div>
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No pending requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Join Requests</h3>
        </div>
        <span className="px-2 py-1 text-xs font-medium bg-warning/10 text-warning rounded-full">
          {pendingRequests.length} pending
        </span>
      </div>

      <div className="space-y-3">
        {pendingRequests.map((request) => {
          const profile = profiles[request.user_id];
          return (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
            >
              <div>
                <p className="font-medium text-foreground">{profile?.name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email || "No email"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleRequest(request.id, request.user_id, "accept")}
                  disabled={processing === request.id}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRequest(request.id, request.user_id, "reject")}
                  disabled={processing === request.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JoinRequestsPanel;
