import {
  Coins,
  Crown,
  Medal,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react-native";
import React, { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/utils/FirebaseConfig";
import { UserStats } from "@/utils/GameHistory";
import globalStyles from "../../styles/global.styles";

type LeaderboardEntry = {
  uid: string;
  displayName: string;
  avatar: string;
  stats: UserStats;
  winRate: number;
  rank: number;
};

const DEFAULT_STATS: UserStats = { totalGames: 0, wins: 0, losses: 0 };

const buildAvatarUrl = (name: string) =>
  `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(name || "Player")}&radius=50&backgroundColor=ffedd5`;

const normaliseStats = (value?: Partial<UserStats> | null): UserStats => ({
  totalGames: typeof value?.totalGames === "number" ? value.totalGames : 0,
  wins: typeof value?.wins === "number" ? value.wins : 0,
  losses: typeof value?.losses === "number" ? value.losses : 0,
});

const calculateWinRate = (stats: UserStats) => {
  const total = stats.totalGames > 0 ? stats.totalGames : stats.wins + stats.losses;
  if (total <= 0) {
    return 0;
  }
  return (stats.wins / total) * 100;
};

const sortLeaderboard = (entries: LeaderboardEntry[]) =>
  [...entries].sort((a, b) => {
    if (b.winRate !== a.winRate) {
      return b.winRate - a.winRate;
    }
    if (b.stats.wins !== a.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }
    return a.stats.totalGames - b.stats.totalGames;
  });

export default function RankDashboardScreen() {
  const styles = globalStyles;
  const [activeTab, setActiveTab] = useState<"global" | "personal">("global");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const currentUid = auth.currentUser?.uid ?? null;

      const mapped: LeaderboardEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as { username?: string; fullName?: string; avatar?: string; stats?: Partial<UserStats> };
        const stats = normaliseStats(data?.stats);
        const displayName = data?.username?.trim() || data?.fullName?.trim() || "Player";
        const winRate = calculateWinRate(stats);
        const avatar = typeof data?.avatar === "string" && data.avatar.trim().length > 0 ? data.avatar : buildAvatarUrl(displayName);
        return {
          uid: docSnap.id,
          displayName,
          avatar,
          stats,
          winRate,
          rank: 0,
        };
      });

      const ranked = sortLeaderboard(mapped).map((entry, index) => ({ ...entry, rank: index + 1 }));
      setLeaderboard(ranked);
      setCurrentUserEntry(currentUid ? ranked.find((entry) => entry.uid === currentUid) ?? null : null);
    } catch (err) {
      console.warn("Failed to load leaderboard", err);
      setErrorMessage("Unable to load the leaderboard right now.");
      setLeaderboard([]);
      setCurrentUserEntry(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLeaderboard();
    }, [refreshLeaderboard])
  );

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isTopThree = item.rank <= 3;
    const badgeBackground =
      item.rank === 1 ? "#FEF3C7" : item.rank === 2 ? "#F3F4F6" : item.rank === 3 ? "#FFF7ED" : "#EFF6FF";
    const winRateLabel = `${item.winRate.toFixed(1)}% win rate`;

    return (
      <View style={styles.leaderboardItem}>
        <View style={[styles.rankBadge, { backgroundColor: badgeBackground }]}>
          {item.rank === 1 ? (
            <Crown size={18} color="#F59E0B" />
          ) : item.rank === 2 ? (
            <Medal size={18} color="#6B7280" />
          ) : item.rank === 3 ? (
            <Medal size={18} color="#F97316" />
          ) : (
            <Text style={styles.rankNumberText}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.avatarWrapper}>
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          {isTopThree && (
            <View
              style={{
                position: "absolute",
                right: -4,
                top: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#FFFFFF",
                backgroundColor: item.rank === 1 ? "#F59E0B" : item.rank === 2 ? "#6B7280" : "#F97316",
              }}
            >
              {item.rank === 1 && <Crown size={10} color="white" />}
              {item.rank === 2 && <Medal size={10} color="white" />}
              {item.rank === 3 && <Medal size={10} color="white" />}
            </View>
          )}
        </View>

        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardTitle}>{item.displayName}</Text>
          <View style={styles.leaderboardSubtitleRow}>
            <Trophy size={14} color="#F59E0B" />
            <Text style={styles.leaderboardSubtitleText}>{item.stats.wins} wins · {item.stats.totalGames} games</Text>
          </View>
        </View>

        <View style={styles.leaderboardStats}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Coins size={14} color="#F59E0B" />
            <Text style={[styles.leaderboardReward, { marginLeft: 6 }]}>{winRateLabel}</Text>
          </View>
          <Text style={styles.leaderboardStreak}>
            <Zap size={12} color="#2563EB" /> {item.stats.wins}-{item.stats.losses} record
          </Text>
        </View>
      </View>
    );
  };

  const personalStats = useMemo(() => currentUserEntry?.stats ?? DEFAULT_STATS, [currentUserEntry]);
  const personalWinRate = useMemo(() => (currentUserEntry ? currentUserEntry.winRate : 0), [currentUserEntry]);
  const progressWidth = `${Math.min(Math.max(personalWinRate, 0), 100).toFixed(0)}%`;
  const nextRankLabel = currentUserEntry && currentUserEntry.rank > 1 ? `#${currentUserEntry.rank - 1}` : "Top";

  return (
    <View style={styles.appContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerRow, { marginBottom: 12 }]}>
          <Text style={{ color: "#0F172A", fontSize: 20, fontWeight: "700" }}>Rank Dashboard</Text>
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 16 }}>
          <Text style={{ color: "#6B7280", textAlign: "center", fontSize: 13, marginBottom: 8 }}>Your Global Ranking</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Trophy color="#F59E0B" size={24} />
            <Text style={{ marginLeft: 8, fontSize: 24, fontWeight: "700", color: "#0F172A" }}>
              {currentUserEntry ? `#${currentUserEntry.rank}` : loading ? "--" : "Unranked"}
            </Text>
          </View>
          {!currentUserEntry && !loading && (
            <Text style={{ color: "#9CA3AF", textAlign: "center", fontSize: 12, marginTop: 4 }}>
              Play and win games to enter the global rankings.
            </Text>
          )}
        </View>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabToggleContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab("global")}
          style={[styles.tabToggle, activeTab === "global" ? styles.tabToggleActive : null]}
        >
          <Text style={activeTab === "global" ? styles.tabToggleTextActive : styles.tabToggleText}>Global Winners</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("personal")}
          style={[styles.tabToggle, activeTab === "personal" ? styles.tabToggleActive : null]}
        >
          <Text style={activeTab === "personal" ? styles.tabToggleTextActive : styles.tabToggleText}>Your Position</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView contentContainerStyle={[styles.pagePadding, { paddingTop: 1, paddingBottom: 24 }]} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === "global" ? (
          <>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                Top Players
              </Text>

              {loading ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : (
                <FlatList
                  style={{ paddingVertical: 10, paddingHorizontal: 1 }}
                  data={leaderboard}
                  renderItem={renderLeaderboardItem}
                  keyExtractor={(item) => item.uid}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    errorMessage ? (
                      <Text style={{ textAlign: "center", color: "#DC2626" }}>{errorMessage}</Text>
                    ) : (
                      <Text style={{ textAlign: "center", color: "#6B7280" }}>No ranked players yet.</Text>
                    )
                  }
                />
              )}
            </View>
            
            <View style={styles.rewardsCard}>
              <Text style={styles.rewardsTitle}>Leaderboard Rewards</Text>

              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#FEF3C7" }]}>
                    <Crown color="#F59E0B" size={24} />
                  </View>
                  <Text style={styles.rewardLabel}>1st Place</Text>
                  <Text style={styles.rewardAmount}>+100 CELO</Text>
                </View>

                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#F3F4F6" }]}>
                    <Medal color="#6B7280" size={24} />
                  </View>
                  <Text style={styles.rewardLabel}>2nd Place</Text>
                  <Text style={styles.rewardAmount}>+75 CELO</Text>
                </View>

                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#FFF7ED" }]}>
                    <Medal color="#F97316" size={24} />
                  </View>
                  <Text style={styles.rewardLabel}>3rd Place</Text>
                  <Text style={styles.rewardAmount}>+50 CELO</Text>
                </View>
              </View>

              <View style={styles.rewardsDivider} />

              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#EFF6FF" }]}>
                    <Star color="#3B82F6" size={20} />
                  </View>
                  <Text style={styles.rewardLabel}>Top 10</Text>
                  <Text style={styles.rewardAmount}>+25 CELO</Text>
                </View>

                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#F5F3FF" }]}>
                    <User color="#8B5CF6" size={20} />
                  </View>
                  <Text style={styles.rewardLabel}>Top 50</Text>
                  <Text style={styles.rewardAmount}>+10 CELO</Text>
                </View>

                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconWrapper, { backgroundColor: "#ECFDF5" }]}>
                    <Trophy color="#10B981" size={20} />
                  </View>
                  <Text style={styles.rewardLabel}>Top 100</Text>
                  <Text style={styles.rewardAmount}>+5 CELO</Text>
                </View>
              </View>
            </View>
          </>
          ) : (
          <>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", paddingBottom: 4, marginBottom: 12 }}>
                Your Ranking Position
              </Text>

              <View style={styles.personalCard}>
                <View style={styles.personalAvatarCircle}>
                  <Trophy color="#3498db" size={48} />
                </View>

                <Text style={styles.personalRank}>
                  {currentUserEntry ? `#${currentUserEntry.rank}` : loading ? "--" : "Unranked"}
                </Text>
                <Text style={styles.personalSubtitle}>Global Ranking</Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressLabel}>Progress to next rank</Text>
                    <Text style={styles.progressTarget}>{currentUserEntry ? nextRankLabel : "--"}</Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: currentUserEntry ? progressWidth : "0%" } as any]} />
                  </View>
                </View>

                <View style={styles.personalStatsRow}>
                  <View style={[styles.statPill, { backgroundColor: "#EFF6FF", marginRight: 8 }]}>
                    <Trophy color="#3498db" size={24} />
                    <Text style={styles.statPillNumber}>{personalStats.wins}</Text>
                    <Text style={styles.statPillLabel}>Games Won</Text>
                  </View>

                  <View style={[styles.statPill, { backgroundColor: "#ECFDF5", marginRight: 8 }]}>
                    <Coins color="#27AE60" size={24} />
                    <Text style={styles.statPillNumber}>{personalWinRate.toFixed(1)}%</Text>
                    <Text style={styles.statPillLabel}>Win Rate</Text>
                  </View>

                  <View style={[styles.statPill, { backgroundColor: "#FFFBEB" }]}>
                    <Zap color="#F39C12" size={24} />
                    <Text style={styles.statPillNumber}>{personalStats.totalGames}</Text>
                    <Text style={styles.statPillLabel}>Games Played</Text>
                  </View>
                </View>

                {!currentUserEntry && !loading && (
                  <Text style={{ color: "#9CA3AF", marginTop: 12, textAlign: "center" }}>
                    Play and win matches to secure a ranking.
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.howToCard}>
              <Text style={styles.howToTitle}>How to Improve Your Rank</Text>

              <View style={styles.howToList}>
                <View style={styles.howToItem}>
                  <View style={[styles.howToIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Star color="#3498db" size={16} />
                  </View>
                  <View style={styles.howToTextContainer}>
                    <Text style={styles.howToItemTitle}>Play More Games</Text>
                    <Text style={styles.howToItemDesc}>Participate in daily challenges to earn more CELO</Text>
                  </View>
                </View>

                <View style={styles.howToItem}>
                  <View style={[styles.howToIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Zap color="#F39C12" size={16} />
                  </View>
                  <View style={styles.howToTextContainer}>
                    <Text style={styles.howToItemTitle}>Maintain Your Streak</Text>
                    <Text style={styles.howToItemDesc}>Keep winning to boost your ranking faster</Text>
                  </View>
                </View>

                <View style={styles.howToItem}>
                  <View style={[styles.howToIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Crown color="#F59E0B" size={16} />
                  </View>
                  <View style={styles.howToTextContainer}>
                    <Text style={styles.howToItemTitle}>Aim for Top 10</Text>
                    <Text style={styles.howToItemDesc}>Reach top positions for bigger CELO rewards</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}