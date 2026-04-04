import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus, Users, Target, Church, Building2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  budget_goal: number | null;
  budget_current: number | null;
  deadline: string | null;
  created_by: string | null;
  member_count: number;
  is_member: boolean;
}

export function ProjectList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("community");
  const [budgetGoal, setBudgetGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchProjects(); }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: projectsData } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (!projectsData) { setLoading(false); return; }

    const { data: members } = await supabase.from("project_members").select("project_id, profile_id");

    const enriched: Project[] = projectsData.map((p: any) => ({
      ...p,
      member_count: members?.filter((m) => m.project_id === p.id).length || 0,
      is_member: !!members?.find((m) => m.project_id === p.id && m.profile_id === user?.id),
    }));
    setProjects(enriched);
    setLoading(false);
  };

  const joinProject = async (projectId: string) => {
    if (!user) return;
    await supabase.from("project_members").insert({ project_id: projectId, profile_id: user.id });
    fetchProjects();
  };

  const leaveProject = async (projectId: string) => {
    if (!user) return;
    await supabase.from("project_members").delete().eq("project_id", projectId).eq("profile_id", user.id);
    fetchProjects();
  };

  const createProject = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("projects").insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      budget_goal: budgetGoal ? parseFloat(budgetGoal) : null,
      deadline: deadline || null,
      created_by: user.id,
    } as any);
    if (!error) {
      setTitle(""); setDescription(""); setBudgetGoal(""); setDeadline(""); setShowCreate(false);
      fetchProjects();
    }
    setCreating(false);
  };

  const statusLabel: Record<string, string> = {
    en_cours: "En cours", termine: "Terminé", en_pause: "En pause",
  };

  const categoryIcon = (cat: string) => cat === "business" ? <Building2 className="w-5 h-5 text-accent-foreground" /> : <Church className="w-5 h-5 text-primary" />;
  const categoryLabel = (cat: string) => cat === "business" ? "Entreprise" : "Communautaire";

  const progressPercent = (current: number | null, goal: number | null) => {
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round(((current || 0) / goal) * 100));
  };

  return (
    <div className="px-4 py-4 space-y-3">
      {user && (
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground">Nouveau projet</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du projet"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} />
            <div className="flex gap-2">
              <button onClick={() => setCategory("community")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${category === "community" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Church className="w-4 h-4" /> Communautaire
              </button>
              <button onClick={() => setCategory("business")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${category === "business" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Building2 className="w-4 h-4" /> Entreprise
              </button>
            </div>
            <input type="number" value={budgetGoal} onChange={(e) => setBudgetGoal(e.target.value)} placeholder="Budget objectif (FCFA, optionnel)"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={createProject} disabled={creating || !title.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-12">Chargement...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun projet pour l'instant</p>
        </div>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {categoryIcon(project.category)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{project.title}</h3>
                  {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {categoryLabel(project.category)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {statusLabel[project.status] || project.status}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" /> {project.member_count}
                    </span>
                    {project.deadline && (
                      <span className="text-[10px] text-muted-foreground">
                        ⏰ {format(new Date(project.deadline), "d MMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {user && (
                project.is_member ? (
                  <button onClick={() => leaveProject(project.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                    Quitter
                  </button>
                ) : (
                  <button onClick={() => joinProject(project.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground shrink-0">
                    Rejoindre
                  </button>
                )
              )}
            </div>
            {project.budget_goal && project.budget_goal > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{(project.budget_current || 0).toLocaleString("fr")} FCFA</span>
                  <span>{project.budget_goal.toLocaleString("fr")} FCFA</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent(project.budget_current, project.budget_goal)}%` }} />
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
