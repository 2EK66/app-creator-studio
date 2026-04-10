import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart, Share2, Plus, Music, Mic2, BookOpen, Gamepad2, Search, ChevronRight } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
  isFavorite: boolean;
}

interface Playlist {
  id: string;
  name: string;
  songCount: number;
  cover: string;
}

// ============================================================
// DONNEES MOCK
// ============================================================
const featuredSongs: Song[] = [
  { id: "1", title: "Tu es digne", artist: "Glorious", duration: "4:32", cover: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", isFavorite: true },
  { id: "2", title: "Oceans", artist: "Hillsong United", duration: "5:18", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", isFavorite: false },
  { id: "3", title: "Way Maker", artist: "Sinach", duration: "6:02", cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", isFavorite: true },
  { id: "4", title: "Reckless Love", artist: "Cory Asbury", duration: "5:45", cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", isFavorite: false },
];

const playlists: Playlist[] = [
  { id: "1", name: "Louange du matin", songCount: 12, cover: "https://images.unsplash.com/photo-1470019693664-1d202d2c0907?w=200&h=200&fit=crop" },
  { id: "2", name: "Adoration profonde", songCount: 8, cover: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=200&h=200&fit=crop" },
  { id: "3", name: "Gospel Francais", songCount: 15, cover: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=200&h=200&fit=crop" },
];

const categories = [
  { id: "music", label: "Musique", icon: Music, color: "from-purple-500 to-indigo-600" },
  { id: "karaoke", label: "Karaoke", icon: Mic2, color: "from-pink-500 to-rose-600" },
  { id: "bible", label: "Bible", icon: BookOpen, color: "from-amber-500 to-orange-600" },
  { id: "games", label: "Jeux", icon: Gamepad2, color: "from-emerald-500 to-teal-600" },
];

// ============================================================
// MINI PLAYER
// ============================================================
function MiniPlayer({ song, isPlaying, onToggle }: { song: Song; isPlaying: boolean; onToggle: () => void }) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40">
      <div className="bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-lg rounded-2xl p-3 shadow-xl border border-purple-500/30">
        <div className="flex items-center gap-3">
          <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{song.title}</p>
            <p className="text-purple-300/70 text-xs truncate">{song.artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <SkipBack className="w-4 h-4 text-white" />
            </button>
            <button 
              onClick={onToggle}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-purple-900" />
              ) : (
                <Play className="w-5 h-5 text-purple-900 ml-0.5" />
              )}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <SkipForward className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SONG CARD
// ============================================================
function SongCard({ song, onPlay, isPlaying }: { song: Song; onPlay: () => void; isPlaying: boolean }) {
  const [isFav, setIsFav] = useState(song.isFavorite);
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
      <div className="relative">
        <img src={song.cover} alt={song.title} className="w-14 h-14 rounded-xl object-cover" />
        <button 
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{song.title}</p>
        <p className="text-purple-300/60 text-xs truncate">{song.artist}</p>
      </div>
      <span className="text-purple-300/50 text-xs">{song.duration}</span>
      <button 
        onClick={() => setIsFav(!isFav)}
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <Heart className={`w-4 h-4 ${isFav ? "fill-pink-500 text-pink-500" : "text-white/40"}`} />
      </button>
    </div>
  );
}

// ============================================================
// PLAYLIST CARD
// ============================================================
function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div className="flex-shrink-0 w-36 cursor-pointer group">
      <div className="relative mb-2 rounded-2xl overflow-hidden shadow-lg">
        <img src={playlist.cover} alt={playlist.name} className="w-36 h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105">
          <Play className="w-5 h-5 text-white ml-0.5" />
        </button>
      </div>
      <p className="text-white font-medium text-sm truncate">{playlist.name}</p>
      <p className="text-purple-300/60 text-xs">{playlist.songCount} titres</p>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL - PAGE LOUANGE (MUSIQUE)
// ============================================================
export default function Louange() {
  const [currentSong, setCurrentSong] = useState<Song | null>(featuredSongs[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCategory, setActiveCategory] = useState("music");

  return (
    <div className="min-h-screen pb-36" style={{
      background: "linear-gradient(180deg, #1a1025 0%, #0f0a18 50%, #0a0510 100%)",
    }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-lg border-b border-purple-500/20 px-4 py-3"
        style={{ background: "rgba(26,16,37,0.8)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Louange</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-white/70" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Categories */}
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                activeCategory === cat.id 
                  ? `bg-gradient-to-br ${cat.color} shadow-lg` 
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <cat.icon className={`w-6 h-6 ${activeCategory === cat.id ? "text-white" : "text-purple-300"}`} />
              <span className={`text-[10px] font-medium ${activeCategory === cat.id ? "text-white" : "text-purple-300/70"}`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Featured Song */}
        {currentSong && (
          <div className="relative rounded-3xl overflow-hidden">
            <img src={currentSong.cover} alt={currentSong.title} className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold text-lg">{currentSong.title}</p>
              <p className="text-purple-200/70 text-sm mb-3">{currentSong.artist}</p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-purple-900 font-semibold text-sm hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  {isPlaying ? "Pause" : "Ecouter"}
                </button>
                <button className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <Heart className="w-5 h-5 text-white" />
                </button>
                <button className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playlists */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Mes Playlists</h2>
            <button className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition-colors">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {playlists.map(playlist => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>

        {/* Songs List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Titres populaires</h2>
            <button className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition-colors">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {featuredSongs.map(song => (
              <SongCard 
                key={song.id} 
                song={song} 
                onPlay={() => {
                  setCurrentSong(song);
                  setIsPlaying(true);
                }}
                isPlaying={isPlaying && currentSong?.id === song.id}
              />
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:border-pink-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-pink-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Karaoke</p>
              <p className="text-purple-300/60 text-xs">Chante avec nous</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Bible Audio</p>
              <p className="text-purple-300/60 text-xs">Ecoute la Parole</p>
            </div>
          </button>
        </section>
      </div>

      {/* Mini Player */}
      {currentSong && (
        <MiniPlayer 
          song={currentSong} 
          isPlaying={isPlaying} 
          onToggle={() => setIsPlaying(!isPlaying)} 
        />
      )}
    </div>
  );
}
