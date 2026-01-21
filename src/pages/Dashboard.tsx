import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GroupCard from "@/components/GroupCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Users, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Group {
  id: string;
  name: string;
  description: string;
  supervisor: string;
  skills: string;
  max_members: number;
  owner_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  name: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [userMemberships, setUserMemberships] = useState<Set<string>>(
    new Set()
  );
  const [userRequests, setUserRequests] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch all profiles for owner names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name");

      if (profilesError) throw profilesError;
      const profileMap: Record<string, string> = {};
      profilesData?.forEach((p) => {
        profileMap[p.user_id] = p.name;
      });
      setProfiles(profileMap);

      // Fetch member counts for each group
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("group_id");

      if (membersError) throw membersError;
      const counts: Record<string, number> = {};
      membersData?.forEach((m) => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });
      // Add 1 for owner in each group
      groupsData?.forEach((g) => {
        counts[g.id] = (counts[g.id] || 0) + 1;
      });
      setMemberCounts(counts);

      // Fetch user's memberships
      const { data: userMemberData, error: userMemberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);

      if (userMemberError) throw userMemberError;
      setUserMemberships(new Set(userMemberData?.map((m) => m.group_id) || []));

      // Fetch user's pending requests
      // Fetch user's pending requests (non-critical, continue if fails)
      const { data: requestsData } = await supabase
        .from("join_requests")
        .select("group_id")
        .eq("user_id", user!.id)
        .eq("status", "pending");

      setUserRequests(new Set(requestsData?.map((r) => r.group_id) || []));
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load groups. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) => {
    const search = searchTerm.toLowerCase();
    const skillsArray = group.skills ? group.skills.split(",") : [];
    const name = group.name || "";
    const supervisor = group.supervisor || "";
    return (
      name.toLowerCase().includes(search) ||
      supervisor.toLowerCase().includes(search) ||
      skillsArray.some((s) => s.toLowerCase().trim().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Project Groups
            </h1>
            <p className="text-muted-foreground mt-1">
              Find your perfect team and start collaborating
            </p>
          </div>
          <Link to="/create-group">
            <Button variant="gradient" size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create New Group
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by project name, supervisor, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {groups.length}
                </p>
                <p className="text-sm text-muted-foreground">Active Groups</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    groups.filter(
                      (g) =>
                        g.owner_id === user?.id || userMemberships.has(g.id)
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Your Groups</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Filter className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {userRequests.size}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                id={group.id}
                projectName={group.name}
                supervisorName={group.supervisor}
                skillsRequired={
                  group.skills
                    ? group.skills.split(",").map((s) => s.trim())
                    : []
                }
                skillsNeeded={[]}
                projectOutcomes={group.description || ""}
                memberCount={memberCounts[group.id] || 1}
                maxMembers={group.max_members || 5}
                ownerName={profiles[group.owner_id] || "Unknown"}
                isOwner={group.owner_id === user?.id}
                isMember={userMemberships.has(group.id)}
                hasRequested={userRequests.has(group.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "No groups found" : "No groups yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Be the first to create a project group!"}
            </p>
            {!searchTerm && (
              <Link to="/create-group">
                <Button variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
