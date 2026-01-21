import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const groupSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100),
  supervisorName: z
    .string()
    .trim()
    .min(2, "Supervisor name is required")
    .max(100),
  projectOutcomes: z.string().max(1000, "Description is too long").optional(),
  maxMembers: z
    .number()
    .min(2, "Minimum 2 members")
    .max(20, "Maximum 20 members"),
});

const CreateGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [projectOutcomes, setProjectOutcomes] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [newSkillRequired, setNewSkillRequired] = useState("");
  const [newSkillNeeded, setNewSkillNeeded] = useState("");

  const addSkillRequired = () => {
    const skill = newSkillRequired.trim();
    if (skill && !skillsRequired.includes(skill)) {
      setSkillsRequired([...skillsRequired, skill]);
      setNewSkillRequired("");
    }
  };

  const addSkillNeeded = () => {
    const skill = newSkillNeeded.trim();
    if (skill && !skillsNeeded.includes(skill)) {
      setSkillsNeeded([...skillsNeeded, skill]);
      setNewSkillNeeded("");
    }
  };

  const removeSkillRequired = (skill: string) => {
    setSkillsRequired(skillsRequired.filter((s) => s !== skill));
  };

  const removeSkillNeeded = (skill: string) => {
    setSkillsNeeded(skillsNeeded.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = groupSchema.safeParse({
        projectName,
        supervisorName,
        projectOutcomes,
        maxMembers,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .insert({
          project_name: projectName.trim(),
          supervisor_name: supervisorName.trim(),
          skills_required: skillsRequired,
          skills_needed: skillsNeeded,
          project_outcomes: projectOutcomes.trim(),
          max_members: maxMembers,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Group Created!",
        description: "Your project group has been created successfully.",
      });

      navigate(`/group/${data.id}`);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Create New Group
              </h1>
              <p className="text-muted-foreground">
                Set up your project and start recruiting
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Your Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisorName">Supervisor Name *</Label>
              <Input
                id="supervisorName"
                placeholder="e.g., Dr. xyz"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectOutcomes">Project Description</Label>
              <Textarea
                id="projectOutcomes"
                placeholder="Describe what your project aims to achieve...with Final Outcomes(Research Paper,WebApp,Patent)"
                value={projectOutcomes}
                onChange={(e) => setProjectOutcomes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min={2}
                max={5}
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 5)}
                className="h-12 w-32"
              />
            </div>

            <div className="space-y-3">
              <Label>Skills (Team has)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={newSkillRequired}
                  onChange={(e) => setNewSkillRequired(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), addSkillRequired())
                  }
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addSkillRequired}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillsRequired.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkillRequired(skill)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Skills Needed (Looking for)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill you're looking for..."
                  value={newSkillNeeded}
                  onChange={(e) => setNewSkillNeeded(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addSkillNeeded())
                  }
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addSkillNeeded}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skillsNeeded.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillsNeeded.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="gap-1 border-accent text-accent"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkillNeeded(skill)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Create Group"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateGroup;
