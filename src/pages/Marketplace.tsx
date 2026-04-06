import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { MirecAvatar } from "@/components/mirec/Avatar";
import {
  Plus, Search, X, Check, ChevronRight,
  MapPin, Phone, MessageCircle, Trash2,
  ShoppingBag, Tag, Clock, RefreshCw
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface Listing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_initials: string;
  seller_phone: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  status: string;
  created_at: string;
  is_mine: boolean;
}

// ============================================================
// CONSTANTES
// ============================================================
const CATEGORIES = [
  { key: "all",           label: "Tout",           emoji: "🛒" },
  { key: "alimentation",  label: "Alimentation",   emoji: "🍎" },
  { key: "vetements",     label: "Vêtements",      emoji: "👗" },
  { key: "services",      label: "Services",       emoji: "🔧" },
  { key: "electronique",  label: "Électronique",   emoji: "📱" },
  { key: "agriculture",   label: "Agriculture",    emoji: "🌾" },
  { key: "formation",     label: "Formation",      emoji: "🎓" },
  { key: "immobilier",    label: "Immobilier",     emoji: "🏠" },
  { key: "transport",     label: "Transport",      emoji: "🚗" },
  { key: "autres",        label: "Autres",         emoji: "📦" },
];

const PRICE_RANGES = [
  { key: "all",   label: "Tous les prix" },
  { key: "free",  label: "Gratuit"       },
  { key: "low",   label: "< 5 000 CFA"  },
  { key: "mid",   label: "5k – 50k CFA" },
  { key: "high",  label: "> 50 000 CFA" },
];

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatPrice(price: number) {
  if (price === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR").format(price) + " CFA";
}

function getCategoryConfig(key: string) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

// ============================================================
// COMPOSANT : CARTE ANNONCE
// ============================================================
function ListingCard({
  listing, onDelete, onContact
}: {
  listing: Listing;
  onDelete: (id: string) => void;
  onContact: (listing: Listing) => void;
}) {
  const cat = getCategoryConfig(listing.category);

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all">

      {/* Header vendeur */}
      <div className="flex items-center gap-2.5 mb-3">
        <MirecAvatar initials={listing.seller_initials} color="hsl(220 70% 35%)" size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{listing.seller_name}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo(listing.created_at)}</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {cat.emoji} {cat.label}
        </span>
        {listing.is_mine && (
          <button onClick={() => onDelete(listing.id)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Contenu */}
      <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-1">{listing.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{listing.description}</p>

      {/* Prix + Lieu */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-base font-bold text-primary">{formatPrice(listing.price)}</span>
        {listing.location && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3" /> {listing.location}
          </span>
        )}
      </div>

      {/* Actions */}
      {!listing.is_mine && (
        <div className="flex gap-2">
          <button
            onClick={() => onContact(listing)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Contacter
          </button>
          {listing.seller_phone && (
            <a
              href={`tel:${listing.seller_phone}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Appeler
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT : FORMULAIRE NOUVELLE ANNONCE
// ============================================================
function NewListingModal({
  onClose, onSubmit
}: {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("services");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      category,
      location: location.trim(),
      seller_phone: phone.trim(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base text-foreground">Nouvelle annonce</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">

          {/* Titre */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Titre de l'annonce *
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Pagnes wax neufs, Cours d'informatique..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.key !== "all").map(cat => (
                <button key={cat.key} onClick={() => setCategory(cat.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${category === cat.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Description *
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Décris ton produit ou service en détail..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Prix */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Prix (CFA) — laisser 0 pour "Gratuit"
            </label>
            <input value={price} onChange={e => setPrice(e.target.value)}
              type="number" placeholder="Ex: 5000"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Localisation */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Quartier / Ville
            </label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Ex: Akpakpa, Cotonou..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Numéro de contact (MTN / Moov)
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              type="tel" placeholder="Ex: 97 00 00 00"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Les acheteurs pourront vous appeler ou envoyer du Mobile Money directement.
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground font-medium">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !title.trim() || !description.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check className="w-4 h-4" /> Publier</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT : MODAL CONTACT
// ============================================================
function ContactModal({
  listing, onClose
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const whatsappMsg = encodeURIComponent(
    `Bonjour ${listing.seller_name}, j'ai vu ton annonce "${listing.title}" sur MIREC. Est-ce encore disponible ?`
  );
  const whatsappUrl = `https://wa.me/${listing.seller_phone?.replace(/\s/g, "")}?text=${whatsappMsg}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-foreground">Contacter le vendeur</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="bg-muted/50 rounded-xl p-3 mb-4">
          <p className="font-semibold text-sm text-foreground mb-0.5">{listing.title}</p>
          <p className="text-xs text-muted-foreground">{listing.seller_name} · {formatPrice(listing.price)}</p>
        </div>

        <div className="space-y-2">
          {listing.seller_phone && (
            <>
              <a href={`tel:${listing.seller_phone}`}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                <Phone className="w-4 h-4" />
                Appeler — {listing.seller_phone}
              </a>

              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                <MessageCircle className="w-4 h-4 text-green-600" />
                WhatsApp
              </a>

              <a href={`sms:${listing.seller_phone}`}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                SMS
              </a>
            </>
          )}

          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Paiement via MTN Mobile Money ou Moov Money recommandé · Rencontrez-vous dans un lieu public
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE — MARCHÉ MIREC
// ============================================================
export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [contactListing, setContactListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ---- Charger les annonces ----
  const fetchListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) { setLoading(false); setRefreshing(false); return; }

    // Récupérer les profils des vendeurs
    const sellerIds = [...new Set(data.map((l: any) => l.seller_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", sellerIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || "Membre"]));

    const enriched: Listing[] = data.map((l: any) => ({
      ...l,
      seller_name: profileMap[l.seller_id] || "Membre MIREC",
      seller_initials: (profileMap[l.seller_id] || "M").slice(0, 2).toUpperCase(),
      is_mine: l.seller_id === user?.id,
    }));

    setListings(enriched);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // ---- Publier une annonce ----
  const handleNewListing = async (data: any) => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("marketplace_listings").insert({
      seller_id: user.id,
      seller_phone: data.seller_phone,
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      location: data.location,
      status: "active",
    });
    if (!error) fetchListings();
  };

  // ---- Supprimer une annonce ----
  const handleDelete = async (id: string) => {
    setListings(prev => prev.filter(l => l.id !== id));
    await supabase.from("marketplace_listings").delete().eq("id", id);
  };

  // ---- Filtrer ----
  const filtered = listings.filter(l => {
    if (category !== "all" && l.category !== category) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) &&
        !l.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (priceRange === "free"  && l.price !== 0)         return false;
    if (priceRange === "low"   && l.price >= 5000)       return false;
    if (priceRange === "mid"   && (l.price < 5000 || l.price >= 50000)) return false;
    if (priceRange === "high"  && l.price < 50000)       return false;
    return true;
  });

  const myListings = listings.filter(l => l.is_mine);

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg text-foreground">Marché MIREC</h1>
            {myListings.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {myListings.length} annonce{myListings.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchListings(true)} disabled={refreshing}
              className="p-2 rounded-full hover:bg-muted transition-colors">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                showFilters ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Tag className="w-3.5 h-3.5" /> Filtres
            </button>
          </div>
        </div>
      </header>

      {/* BARRE RECHERCHE */}
      <div className="sticky top-[57px] z-20 bg-background/90 backdrop-blur-md border-b border-border/30 px-4 py-2.5">
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou service..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted text-sm outline-none border border-transparent focus:border-primary/30" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTRES */}
      {showFilters && (
        <div className="bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Catégories */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Catégorie</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.key} onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                      ${category === cat.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prix */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Prix</p>
              <div className="flex gap-2 flex-wrap">
                {PRICE_RANGES.map(r => (
                  <button key={r.key} onClick={() => setPriceRange(r.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${priceRange === r.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATS RAPIDES */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { val: listings.length,                         label: "Annonces"     },
            { val: [...new Set(listings.map(l=>l.seller_id))].length, label: "Vendeurs" },
            { val: myListings.length,                       label: "Mes annonces" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-3 text-center shadow-sm">
              <div className="text-lg font-bold text-foreground">{s.val}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LISTE ANNONCES */}
      <div className="max-w-lg mx-auto px-4 pb-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-4">🛒</span>
            <p className="font-bold text-foreground mb-2">
              {listings.length === 0 ? "Le marché est vide" : "Aucune annonce trouvée"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {listings.length === 0
                ? "Sois le premier à publier une annonce dans la communauté MIREC !"
                : "Essaie de modifier tes filtres ou ta recherche."}
            </p>
            <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              <Plus className="w-4 h-4" /> Publier une annonce
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium">
              {filtered.length} annonce{filtered.length > 1 ? "s" : ""}
              {search && ` pour "${search}"`}
              {category !== "all" && ` · ${getCategoryConfig(category).label}`}
            </p>
            {filtered.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onDelete={handleDelete}
                onContact={setContactListing}
              />
            ))}
          </>
        )}
      </div>

      {/* BOUTON PUBLIER */}
      <button
        onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* MODALS */}
      {showNew && (
        <NewListingModal onClose={() => setShowNew(false)} onSubmit={handleNewListing} />
      )}
      {contactListing && (
        <ContactModal listing={contactListing} onClose={() => setContactListing(null)} />
      )}
    </div>
  );
}
