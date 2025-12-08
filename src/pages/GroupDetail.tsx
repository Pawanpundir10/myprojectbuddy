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
  project_name: string;
  supervisor_name: string;
  skills_required: string[];
  skills_needed: string[];
  project_outcomes: string;
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
        description: "Failed to load group details.",
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
                      {group.project_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Supervised by {group.supervisor_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary">
                    <Users className="h-4 w-4 text-secondary-foreground" />
                    <span className="font-semibold text-secondary-foreground">
                      {memberCount}/{group.max_members}
                    </span>
                  </div>
                </div>

                {group.project_outcomes && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">Project Outcomes</span>
                    </div>
                    <p className="text-muted-foreground">{group.project_outcomes}</p>
                  </div>
                )}

                {/* Skills */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {group.skills_required.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Skills We Have</p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills_required.map((skill, i) => (
                          <Badge key={i} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {group.skills_needed.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Skills We Need</p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills_needed.map((skill, i) => (
                          <Badge key={i} variant="outline" className="border-accent text-accent">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!isOwner && !isMember && !hasRequestedPending && !wasRejected && (
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
                    <span className="font-medium">Your request is pending approval</span>
                  </div>
                )}

                {wasRejected && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">Your request was declined</span>
                  </div>
                )}

                {isMember && !isOwner && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">You're a member of this group</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Created {format(new Date(group.created_at), "PPP")}</span>
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
    </div>
  );
};

export default GroupDetail;
