import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Plus, MapPin, Clock, UserCheck, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  created_by: string | null;
  rsvp_count: number;
  user_rsvp: boolean;
}

export function EventList() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchEvents(); }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events").select("*").order("event_date", { ascending: true });
    if (!eventsData) { setLoading(false); return; }

    const { data: rsvps } = await supabase.from("event_rsvp").select("event_id, profile_id");

    const enriched: Event[] = eventsData.map((e) => ({
      ...e,
      rsvp_count: rsvps?.filter((r) => r.event_id === e.id).length || 0,
      user_rsvp: !!rsvps?.find((r) => r.event_id === e.id && r.profile_id === user?.id),
    }));
    setEvents(enriched);
    setLoading(false);
  };

  const toggleRsvp = async (event: Event) => {
    if (!user) return;
    if (event.user_rsvp) {
      await supabase.from("event_rsvp").delete().eq("event_id", event.id).eq("profile_id", user.id);
    } else {
      await supabase.from("event_rsvp").insert({ event_id: event.id, profile_id: user.id });
    }
    fetchEvents();
  };

  const createEvent = async () => {
    if (!user || !title.trim() || !eventDate) return;
    setCreating(true);
    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      description: description.trim() || null,
      event_date: new Date(eventDate).toISOString(),
      created_by: user.id,
    });
    if (!error) {
      setTitle(""); setDescription(""); setEventDate(""); setShowCreate(false);
      fetchEvents();
    }
    setCreating(false);
  };

  const isPast = (date: string) => new Date(date) < new Date();

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
            <h3 className="font-display text-lg font-bold text-foreground">Nouvel événement</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} />
            <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={createEvent} disabled={creating || !title.trim() || !eventDate}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-12">Chargement...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun événement prévu</p>
        </div>
      ) : (
        events.map((event) => (
          <div key={event.id} className={`bg-card rounded-2xl p-4 border border-border/50 shadow-sm ${isPast(event.event_date) ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">{event.title}</h3>
                {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[11px] text-primary">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(event.event_date), "d MMM yyyy · HH:mm", { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <UserCheck className="w-3.5 h-3.5" />
                    {event.rsvp_count} participant{event.rsvp_count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {user && !isPast(event.event_date) && (
                <button onClick={() => toggleRsvp(event)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    event.user_rsvp
                      ? "border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      : "bg-primary text-primary-foreground"
                  }`}>
                  {event.user_rsvp ? "Annuler" : "Participer"}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
