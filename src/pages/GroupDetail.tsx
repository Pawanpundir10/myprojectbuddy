import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ChatBox from "@/components/ChatBox";
import JoinRequestsPanel from "@/components/JoinRequestsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Users,
  User,
  Target,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface Group {
  id: string;
  name: string;
  supervisor: string;
  skills: string;
  description: string;
  max_members: number;
  owner_id: string;
  created_at: string;
}

interface Member {
  user_id: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  name: string;
  email: string;
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = group?.owner_id === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id) || isOwner;
  const userRequest = requests.find((r) => r.user_id === user?.id);
  const hasRequestedPending = userRequest?.status === "pending";
  const wasRejected = userRequest?.status === "rejected";

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (groupError) throw groupError;
      if (!groupData) {
        toast({
          title: "Group not found",
          description: "This group doesn't exist or has been deleted.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setGroup(groupData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch join requests (for owner)
      const { data: requestsData, error: requestsError } = await supabase
        .from("join_requests")
        .select("*")
        .eq("group_id", id);

      if (!requestsError) {
        setRequests(requestsData || []);
      }

      // Fetch all relevant profiles
      const userIds = [
        groupData.owner_id,
        ...(membersData?.map((m) => m.user_id) || []),
        ...(requestsData?.map((r) => r.user_id) || []),
      ];

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", [...new Set(userIds)]);

      if (!profilesError && profilesData) {
        const profileMap: Record<string, Profile> = {};
        profilesData.forEach((p) => {
          profileMap[p.user_id] = p;
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load group details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!group || !user) return;
    setRequesting(true);

    try {
      const { error } = await supabase.from("join_requests").insert({
        group_id: group.id,
        user_id: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Requested",
            description: "You have already requested to join this group.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Request Sent!",
          description: "Your join request has been sent to the group owner.",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "Failed to send join request.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group!.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: "The member has been removed from the group.",
      });
      fetchData();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", group.id);

      if (error) throw error;

      toast({
        title: "Group Deleted",
        description: "The group has been successfully deleted.",
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: "Failed to delete group.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const memberCount = members.length + 1; // +1 for owner
  const profilesMap = Object.fromEntries(
    Object.entries(profiles).map(([k, v]) => [k, v.name])
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="h-2 bg-gradient-primary" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                      {group.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Supervised by {group.supervisor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary">
                    <Users className="h-4 w-4 text-secondary-foreground" />
                    <span className="font-semibold text-secondary-foreground">
                      {memberCount}/{group.max_members}
                    </span>
                  </div>
                </div>

                {group.description && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Project Outcomes
                      </span>
                    </div>
                    <p className="text-muted-foreground">{group.description}</p>
                  </div>
                )}

                {/* Skills */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {group.skills && group.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills.split(",").map((skill, i) => (
                          <Badge key={i} variant="secondary">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!isOwner &&
                  !isMember &&
                  !hasRequestedPending &&
                  !wasRejected && (
                    <Button
                      variant="gradient"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={handleJoinRequest}
                      disabled={requesting}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {requesting ? "Sending..." : "Request to Join"}
                    </Button>
                  )}

                {hasRequestedPending && (
                  <div className="flex items-center gap-2 text-warning">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Your request is pending approval
                    </span>
                  </div>
                )}

                {wasRejected && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Your request was declined
                    </span>
                  </div>
                )}

                {isMember && !isOwner && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      You're a member of this group
                    </span>
                  </div>
                )}

                {isOwner && (
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full sm:w-auto mt-4"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </Button>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Created {format(new Date(group.created_at), "PPP")}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat - only for members */}
            {isMember && <ChatBox groupId={group.id} profiles={profilesMap} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members List */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Team Members</h3>
              </div>

              <div className="space-y-3">
                {/* Owner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {profiles[group.owner_id]?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {profiles[group.owner_id]?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">Owner</p>
                    </div>
                  </div>
                </div>

                {/* Members */}
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                        {profiles[member.user_id]?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {profiles[member.user_id]?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">Member</p>
                      </div>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Join Requests - only for owner */}
            {isOwner && (
              <JoinRequestsPanel
                groupId={group.id}
                requests={requests}
                profiles={profiles}
                onRequestHandled={fetchData}
              />
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Group</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this group? This action cannot be
            undone. All members will be removed and all group data will be
            permanently deleted.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Group"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupDetail;
