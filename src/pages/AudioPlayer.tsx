import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Download, Play, Pause, X, SkipBack, SkipForward } from "lucide-react";

export default function AudioPlayer({ episode, onClose }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null);

  // Télécharger pour hors‑ligne
  const downloadOffline = async () => {
    const cache = await caches.open("podcast-offline");
    const response = await fetch(episode.audio_url);
    await cache.put(episode.audio_url, response);
    await supabase.from("offline_downloads").insert({ user_id: user.id, episode_id: episode.id });
    alert("Épisode téléchargé !");
  };

  // Charger depuis cache si disponible
  useEffect(() => {
    const loadFromCache = async () => {
      const cache = await caches.open("podcast-offline");
      const cached = await cache.match(episode.audio_url);
      if (cached) {
        const blob = await cached.blob();
        setOfflineUrl(URL.createObjectURL(blob));
      } else {
        setOfflineUrl(episode.audio_url);
      }
    };
    loadFromCache();
  }, [episode.id]);

  useEffect(() => {
    if (audioRef.current && offlineUrl) {
      audioRef.current.src = offlineUrl;
      audioRef.current.load();
    }
  }, [offlineUrl]);

  // ... reste du lecteur (play/pause/seek/volume) identique à ton code existant

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 bg-card border-t border-border p-3">
      <audio ref={audioRef} />
      <div className="flex items-center gap-3">
        <button onClick={downloadOffline}><Download className="w-4 h-4" /></button>
        <button onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
