import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, RefreshControl,
  FlatList, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// ============================================================
// TYPES
// ============================================================
interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  points_total: number;
  streak_days: number;
  role: string;
  quartier: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  type: string;
  created_at: string;
  reactions: { amen: number; feu: number; coeur: number };
}

interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
}

interface Level {
  name: string;
  points_min: number;
  points_max: number;
  badge_icon: string;
  next_name: string;
  next_points: number;
}

// ============================================================
// PALETTE MIREC
// ============================================================
const C = {
  blue900: '#0D2E6B',
  blue800: '#1A4B9B',
  blue700: '#2258B8',
  blue500: '#4A7FD4',
  blue100: '#D6E8FB',
  blue50:  '#EEF5FD',
  white:   '#FFFFFF',
  gray700: '#374151',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
  gray100: '#F3F4F6',
  gray50:  '#F9FAFB',
  purple:  '#7C3AED',
  amber:   '#D97706',
  green:   '#059669',
  red:     '#DC2626',
  dark:    '#111827',
  darkCard:'#1F2937',
  darkBorder:'#374151',
};

// ============================================================
// NIVEAUX SPIRITUELS
// ============================================================
const LEVELS = [
  { name: 'Nouveau croyant', points_min: 0,    points_max: 200,  badge_icon: '🌱', next_name: 'Disciple',    next_points: 200  },
  { name: 'Disciple',        points_min: 200,  points_max: 600,  badge_icon: '📖', next_name: 'Serviteur',   next_points: 600  },
  { name: 'Serviteur',       points_min: 600,  points_max: 1500, badge_icon: '🙏', next_name: 'Évangéliste', next_points: 1500 },
  { name: 'Évangéliste',     points_min: 1500, points_max: 3000, badge_icon: '📣', next_name: 'Ancien',      next_points: 3000 },
  { name: 'Ancien',          points_min: 3000, points_max: 6000, badge_icon: '⭐', next_name: 'Prophète',    next_points: 6000 },
  { name: 'Prophète',        points_min: 6000, points_max: 99999,badge_icon: '🏆', next_name: 'Prophète',    next_points: 99999},
];

function getLevel(points: number): Level {
  const level = LEVELS.find(l => points >= l.points_min && points < l.points_max);
  return level || LEVELS[LEVELS.length - 1];
}

// ============================================================
// BADGES DISPONIBLES
// ============================================================
const ALL_BADGES = [
  { type: 'baptise',      icon: '✝',  label: 'Baptisé'         },
  { type: 'lecteur',      icon: '📖', label: 'Lecteur assidu'  },
  { type: 'intercesseur', icon: '🙏', label: 'Intercesseur'    },
  { type: 'louange',      icon: '🎶', label: 'Louange'         },
  { type: 'temoin',       icon: '✨', label: 'Témoin'          },
  { type: 'serviteur',    icon: '🤝', label: 'Serviteur'       },
  { type: 'fidele',       icon: '🔥', label: 'Fidèle'          },
  { type: 'champion',     icon: '🏆', label: 'Champion'        },
];

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function typeLabel(type: string): { label: string; color: string; bg: string } {
  const map: Record<string, any> = {
    testimony:    { label: 'Témoignage', color: C.green,   bg: '#ECFDF5' },
    prayer:       { label: 'Prière',     color: C.purple,  bg: '#F5F3FF' },
    announcement: { label: 'Annonce',    color: C.blue800, bg: C.blue50  },
    verse:        { label: 'Verset',     color: C.amber,   bg: '#FFFBEB' },
    post:         { label: 'Post',       color: C.gray500, bg: C.gray100 },
  };
  return map[type] || map['post'];
}

function getInitials(name: string): string {
  return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'M';
}

// ============================================================
// COMPOSANT AVATAR
// ============================================================
function Avatar({ name, size = 80, dark }: { name: string; size?: number; dark?: boolean }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.blue800,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: C.blue500,
    }}>
      <Text style={{
        color: C.white, fontSize: size * 0.33,
        fontWeight: '700', letterSpacing: 1,
      }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ============================================================
// COMPOSANT STAT CARD
// ============================================================
function StatCard({ value, label, dark }: { value: string | number; label: string; dark: boolean }) {
  return (
    <View style={[styles.statCard, dark && styles.statCardDark]}>
      <Text style={[styles.statValue, dark && { color: C.white }]}>{value}</Text>
      <Text style={[styles.statLabel, dark && { color: C.gray500 }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// COMPOSANT POST CARD (mini version pour le profil)
// ============================================================
function ProfilePostCard({ post, dark }: { post: Post; dark: boolean }) {
  const tc = typeLabel(post.type);
  const totalReactions = (post.reactions?.amen || 0) + (post.reactions?.feu || 0) + (post.reactions?.coeur || 0);

  return (
    <View style={[styles.postCard, dark && styles.postCardDark]}>
      <View style={styles.postHeader}>
        <View style={[styles.postTypeBadge, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : tc.bg }]}>
          <Text style={[styles.postTypeText, { color: dark ? C.blue100 : tc.color }]}>{tc.label}</Text>
        </View>
        <Text style={[styles.postTime, dark && { color: C.gray500 }]}>{timeAgo(post.created_at)}</Text>
      </View>
      <Text style={[styles.postContent, dark && { color: '#D1D5DB' }]} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.postFooter}>
        <Text style={[styles.postReactions, dark && { color: C.gray500 }]}>
          🙏 {post.reactions?.amen || 0}  🔥 {post.reactions?.feu || 0}  ❤️ {post.reactions?.coeur || 0}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// ÉCRAN PROFIL PRINCIPAL
// ============================================================
export default function ProfilScreen() {
  const router = useRouter();
  const { session, setSession } = useAuthStore();
  const myId = session?.user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'badges' | 'points'>('posts');

  // ---- Charger les données ----
  const loadData = useCallback(async () => {
    if (!myId) return;

    // Profil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', myId)
      .single();
    if (profileData) setProfile(profileData);

    // Posts de l'utilisateur
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, content, type, created_at')
      .eq('author_id', myId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsData) {
      // Charger les réactions pour chaque post
      const postsWithReactions = await Promise.all(
        postsData.map(async (post) => {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('type')
            .eq('post_id', post.id);

          const reactionCount = { amen: 0, feu: 0, coeur: 0 };
          reactions?.forEach((r: any) => {
            if (r.type in reactionCount) reactionCount[r.type as keyof typeof reactionCount]++;
          });

          return { ...post, reactions: reactionCount };
        })
      );
      setPosts(postsWithReactions);
    }

    // Badges
    const { data: badgesData } = await supabase
      .from('badges')
      .select('*')
      .eq('profile_id', myId);
    if (badgesData) setBadges(badgesData);

    setLoading(false);
    setRefreshing(false);
  }, [myId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ---- Déconnexion ----
  const handleSignOut = async () => {
    Alert.alert(
      'Se déconnecter',
      'Tu vas quitter la communauté MIREC. À bientôt !',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            setSession(null);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.loadingDark]}>
        <ActivityIndicator size="large" color={C.blue800} />
      </View>
    );
  }

  if (!profile) return null;

  const level = getLevel(profile.points_total || 0);
  const progressPercent = level.points_max === 99999
    ? 100
    : Math.min(100, Math.round(((profile.points_total - level.points_min) / (level.points_max - level.points_min)) * 100));

  const bg = darkMode ? C.dark : C.gray50;
  const cardBg = darkMode ? C.darkCard : C.white;
  const textPrimary = darkMode ? C.white : C.blue900;
  const textSecondary = darkMode ? '#9CA3AF' : C.gray500;
  const border = darkMode ? C.darkBorder : C.gray100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue500} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ---- HEADER PROFIL ---- */}
      <View style={[styles.header, { backgroundColor: darkMode ? '#0D1B35' : C.blue900 }]}>
        <Avatar name={profile.full_name} size={80} />

        <Text style={styles.headerName}>{profile.full_name}</Text>
        <Text style={styles.headerUsername}>@{profile.username}</Text>
        {profile.quartier && (
          <Text style={styles.headerQuartier}>📍 {profile.quartier}</Text>
        )}

        {/* Badge rôle */}
        {profile.role !== 'membre' && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {profile.role === 'pasteur' ? '⛪ Pasteur'
               : profile.role === 'diacre' ? '🤝 Diacre'
               : profile.role === 'admin' ? '🛡 Admin'
               : profile.role}
            </Text>
          </View>
        )}

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <StatCard value={posts.length} label="Posts" dark={true} />
          <StatCard value={profile.points_total || 0} label="Points" dark={true} />
          <StatCard value={`${profile.streak_days || 0}🔥`} label="Streak" dark={true} />
          <StatCard value={badges.length} label="Badges" dark={true} />
        </View>
      </View>

      {/* ---- NIVEAU SPIRITUEL ---- */}
      <View style={[styles.levelCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.levelHeader}>
          <Text style={{ fontSize: 28 }}>{level.badge_icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.levelName, { color: textPrimary }]}>{level.name}</Text>
            <Text style={[styles.levelSub, { color: textSecondary }]}>
              {profile.points_total} pts · {level.points_max === 99999 ? 'Niveau max !' : `${level.points_max - (profile.points_total || 0)} pts pour ${level.next_name}`}
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={[styles.progressBg, { backgroundColor: darkMode ? '#374151' : C.gray100 }]}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: textSecondary }]}>{level.name}</Text>
          <Text style={[styles.progressLabel, { color: textSecondary }]}>{level.next_name}</Text>
        </View>

        {/* Parcours des niveaux */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <View style={styles.levelsRow}>
            {LEVELS.map((l, i) => {
              const reached = (profile.points_total || 0) >= l.points_min;
              return (
                <View key={i} style={styles.levelStep}>
                  <View style={[
                    styles.levelStepCircle,
                    reached && styles.levelStepCircleActive,
                    l.name === level.name && styles.levelStepCircleCurrent,
                  ]}>
                    <Text style={{ fontSize: 16 }}>{l.badge_icon}</Text>
                  </View>
                  <Text style={[styles.levelStepName, { color: reached ? textPrimary : textSecondary }]}>
                    {l.name.split(' ')[0]}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ---- TABS ---- */}
      <View style={[styles.tabs, { backgroundColor: cardBg, borderColor: border }]}>
        {[
          { key: 'posts',  label: `📝 Posts (${posts.length})`   },
          { key: 'badges', label: `🏅 Badges (${badges.length})` },
          { key: 'points', label: '📊 Historique'                },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key as any)}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
          >
            <Text style={[
              styles.tabBtnText,
              { color: activeTab === t.key ? C.white : textSecondary }
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ---- CONTENU TABS ---- */}
      <View style={{ padding: 12 }}>

        {/* POSTS */}
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📝</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Aucune publication</Text>
                <Text style={[styles.emptySub, { color: textSecondary }]}>
                  Partage un témoignage, une prière ou une pensée avec la communauté !
                </Text>
              </View>
            ) : (
              posts.map(post => (
                <ProfilePostCard key={post.id} post={post} dark={darkMode} />
              ))
            )}
          </>
        )}

        {/* BADGES */}
        {activeTab === 'badges' && (
          <View style={styles.badgesGrid}>
            {ALL_BADGES.map(b => {
              const earned = badges.find(earned => earned.badge_type === b.type);
              return (
                <View key={b.type} style={[
                  styles.badgeCard,
                  { backgroundColor: cardBg, borderColor: border },
                  !earned && styles.badgeCardLocked,
                ]}>
                  <Text style={[styles.badgeIcon, !earned && { opacity: 0.25 }]}>
                    {b.icon}
                  </Text>
                  <Text style={[styles.badgeLabel, { color: earned ? textPrimary : textSecondary }]}>
                    {b.label}
                  </Text>
                  {earned ? (
                    <Text style={styles.badgeEarned}>✓ Obtenu</Text>
                  ) : (
                    <Text style={[styles.badgeLocked, { color: textSecondary }]}>🔒</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* HISTORIQUE POINTS */}
        {activeTab === 'points' && (
          <PointsHistory myId={myId!} dark={darkMode} />
        )}
      </View>

      {/* ---- PARAMÈTRES ---- */}
      <View style={[styles.settingsCard, { backgroundColor: cardBg, borderColor: border }]}>

        <TouchableOpacity style={[styles.settingRow, { borderColor: border }]}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>✏️</Text>
          <Text style={[styles.settingLabel, { color: textPrimary }]}>Modifier le profil</Text>
          <Text style={[styles.settingArrow, { color: textSecondary }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.settingRow, { borderColor: border }]}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>🌙</Text>
          <Text style={[styles.settingLabel, { color: textPrimary }]}>Mode sombre</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: C.gray300, true: C.blue800 }}
            thumbColor={C.white}
          />
        </View>

        <TouchableOpacity style={[styles.settingRow, { borderColor: border }]}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>🔔</Text>
          <Text style={[styles.settingLabel, { color: textPrimary }]}>Notifications</Text>
          <Text style={[styles.settingArrow, { color: textSecondary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingRow, { borderColor: border }]}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>📱</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: textPrimary }]}>Télécharger l'application</Text>
            <Text style={[styles.settingSubLabel, { color: textSecondary }]}>Bientôt disponible (APK Android)</Text>
          </View>
          <Text style={[styles.settingArrow, { color: textSecondary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignOut} style={[styles.settingRow, { borderColor: 'transparent' }]}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>🚪</Text>
          <Text style={[styles.settingLabel, { color: C.red }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: textSecondary }]}>
        MIREC v1.0 · Communauté de foi · Cotonou
      </Text>
    </ScrollView>
  );
}

// ============================================================
// COMPOSANT HISTORIQUE POINTS
// ============================================================
function PointsHistory({ myId, dark }: { myId: string; dark: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('points_log')
      .select('*')
      .eq('profile_id', myId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setLogs(data);
        setLoading(false);
      });
  }, [myId]);

  const actionLabel: Record<string, string> = {
    reaction:       '👍 Réaction donnée',
    comment:        '💬 Commentaire posté',
    post_testimony: '✨ Témoignage partagé',
    post_prayer:    '🙏 Prière partagée',
    post_verse:     '📖 Verset partagé',
    post_post:      '📝 Post publié',
    group_message:  '👥 Message dans un groupe',
  };

  if (loading) return <ActivityIndicator color={C.blue800} style={{ marginTop: 20 }} />;

  if (logs.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
        <Text style={[styles.emptyTitle, { color: dark ? C.white : C.blue900 }]}>
          Aucun historique
        </Text>
        <Text style={[styles.emptySub, { color: dark ? '#9CA3AF' : C.gray500 }]}>
          Commence à interagir pour gagner des points !
        </Text>
      </View>
    );
  }

  return (
    <>
      {logs.map((log, i) => (
        <View key={log.id || i} style={[
          styles.logRow,
          { borderColor: dark ? C.darkBorder : C.gray100,
            backgroundColor: dark ? C.darkCard : C.white }
        ]}>
          <Text style={{ fontSize: 14, flex: 1, color: dark ? '#D1D5DB' : C.gray700 }}>
            {actionLabel[log.action] || log.action}
          </Text>
          <View style={styles.logRight}>
            <Text style={styles.logPoints}>+{log.points} pts</Text>
            <Text style={{ fontSize: 10, color: dark ? '#6B7280' : C.gray500 }}>
              {timeAgo(log.created_at)}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray50 },
  loadingDark: { backgroundColor: C.dark },

  // Header
  header: {
    alignItems: 'center', paddingTop: 40,
    paddingBottom: 24, paddingHorizontal: 20,
  },
  headerName: {
    color: C.white, fontSize: 22, fontWeight: '700',
    marginTop: 12, letterSpacing: 0.5,
  },
  headerUsername: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  headerQuartier: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    marginTop: 8,
  },
  roleBadgeText: { color: C.white, fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', gap: 8,
    marginTop: 20, width: '100%',
  },
  statCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingVertical: 10,
  },
  statCardDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: 18, fontWeight: '700', color: C.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Niveau
  levelCard: {
    margin: 12, borderRadius: 16,
    borderWidth: 1, padding: 16,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelName: { fontSize: 16, fontWeight: '700' },
  levelSub: { fontSize: 12, marginTop: 2 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: C.blue800,
  },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4,
  },
  progressLabel: { fontSize: 10 },
  levelsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  levelStep: { alignItems: 'center', gap: 4 },
  levelStepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  levelStepCircleActive: { backgroundColor: C.blue50, borderColor: C.blue100 },
  levelStepCircleCurrent: { backgroundColor: C.blue800, borderColor: C.blue500 },
  levelStepName: { fontSize: 9, fontWeight: '500' },

  // Tabs
  tabs: {
    flexDirection: 'row', marginHorizontal: 12,
    borderRadius: 12, padding: 4, gap: 4,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8,
    borderRadius: 9, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: C.blue800 },
  tabBtnText: { fontSize: 11, fontWeight: '600' },

  // Posts
  postCard: {
    borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1,
    backgroundColor: C.white, borderColor: C.gray100,
  },
  postCardDark: { backgroundColor: C.darkCard, borderColor: C.darkBorder },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  postTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  postTypeText: { fontSize: 10, fontWeight: '600' },
  postTime: { fontSize: 10, color: C.gray500 },
  postContent: { fontSize: 13, lineHeight: 19, color: C.gray700 },
  postFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.gray100 },
  postReactions: { fontSize: 12, color: C.gray500 },

  // Badges
  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  badgeCard: {
    width: '22%', alignItems: 'center',
    borderRadius: 12, padding: 10,
    borderWidth: 1,
  },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  badgeEarned: { fontSize: 9, color: C.green, fontWeight: '700' },
  badgeLocked: { fontSize: 10 },

  // Points log
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 6,
    borderWidth: 1,
  },
  logRight: { alignItems: 'flex-end' },
  logPoints: { fontSize: 14, fontWeight: '700', color: C.green },

  // Settings
  settingsCard: {
    margin: 12, borderRadius: 16,
    borderWidth: 1, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: 1,
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  settingSubLabel: { fontSize: 11, marginTop: 1 },
  settingArrow: { fontSize: 20 },

  // Empty states
  emptyState: {
    alignItems: 'center', paddingTop: 40, paddingHorizontal: 30,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  footer: {
    textAlign: 'center', fontSize: 11,
    paddingVertical: 20,
  },
});
