import {
    Coins,
    Crown,
    Medal,
    Star,
    Trophy,
    User,
    Zap,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import globalStyles from "../../styles/global.styles";

// Mock data for leaderboard
const mockLeaderboardData = [
  {
    id: 1,
    username: "CryptoMaster",
    rank: 1,
    celoEarned: "+420 CELO",
    gamesWon: 142,
    winStreak: 12,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 2,
    username: "BlockchainPro",
    rank: 2,
    celoEarned: "+380 CELO",
    gamesWon: 132,
    winStreak: 8,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 3,
    username: "CeloChampion",
    rank: 3,
    celoEarned: "+350 CELO",
    gamesWon: 128,
    winStreak: 15,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 4,
    username: "DigitalAce",
    rank: 4,
    celoEarned: "+320 CELO",
    gamesWon: 115,
    winStreak: 6,
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 5,
    username: "TokenTiger",
    rank: 5,
    celoEarned: "+300 CELO",
    gamesWon: 108,
    winStreak: 9,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 6,
    username: "ChainWizard",
    rank: 6,
    celoEarned: "+280 CELO",
    gamesWon: 95,
    winStreak: 7,
    avatar: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 7,
    username: "DeFiDragon",
    rank: 7,
    celoEarned: "+260 CELO",
    gamesWon: 92,
    winStreak: 5,
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&auto=format&fit=crop&q=60",
  },
  {
    id: 8,
    username: "NFTKnight",
    rank: 8,
    celoEarned: "+240 CELO",
    gamesWon: 88,
    winStreak: 4,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&auto=format&fit=crop&q=60",
  },
];

// Mock data for user's personal ranking
const userRankData = {
  id: 99,
  username: "ChallengeArena",
  rank: 54,
  celoEarned: "+20 CELO",
  gamesWon: 42,
  winStreak: 8,
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&auto=format&fit=crop&q=60",
};

export default function RankDashboardScreen() {
  const styles = globalStyles;
  const [activeTab, setActiveTab] = useState<"global" | "personal">("global");

  // Render a single leaderboard item
  const renderLeaderboardItem = ({ item }: { item: typeof mockLeaderboardData[0] }) => {
    const isTopThree = item.rank <= 3;

    const badgeBackground =
      item.rank === 1 ? "#FEF3C7" : item.rank === 2 ? "#F3F4F6" : item.rank === 3 ? "#FFF7ED" : "#EFF6FF";

    return (
      <View style={styles.leaderboardItem}>
        {/* Rank badge */}
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

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          {isTopThree && (
            <View style={{ position: "absolute", right: -4, top: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: item.rank === 1 ? "#F59E0B" : item.rank === 2 ? "#6B7280" : "#F97316" }}>
              {item.rank === 1 && <Crown size={10} color="white" />}
              {item.rank === 2 && <Medal size={10} color="white" />}
              {item.rank === 3 && <Medal size={10} color="white" />}
            </View>
          )}
        </View>

        {/* User info */}
        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardTitle}>{item.username}</Text>
          <View style={styles.leaderboardSubtitleRow}>
            <Trophy size={14} color="#F59E0B" />
            <Text style={styles.leaderboardSubtitleText}>{item.gamesWon} games won</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.leaderboardStats}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Coins size={14} color="#F59E0B" />
            <Text style={[styles.leaderboardReward, { marginLeft: 6 }]}>{item.celoEarned}</Text>
          </View>
          <Text style={styles.leaderboardStreak}><Zap size={12} color="#2563EB" /> {item.winStreak} streak</Text>
        </View>
      </View>
    );
  };

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
            <Text style={{ marginLeft: 8, fontSize: 24, fontWeight: "700", color: "#0F172A" }}>#{userRankData.rank}</Text>
          </View>
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
              
              <FlatList
              style={{paddingVertical: 10, paddingHorizontal: 1}}
                data={mockLeaderboardData}
                renderItem={renderLeaderboardItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
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

                  <Text style={styles.personalRank}>#{userRankData.rank}</Text>
                  <Text style={styles.personalSubtitle}>Global Ranking</Text>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeaderRow}>
                      <Text style={styles.progressLabel}>Progress to next rank</Text>
                      <Text style={styles.progressTarget}>#53</Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: "65%" }]} />
                    </View>
                  </View>

                  <View style={styles.personalStatsRow}>
                    <View style={[styles.statPill, { backgroundColor: "#EFF6FF", marginRight: 8 }]}>
                      <Trophy color="#3498db" size={24} />
                      <Text style={styles.statPillNumber}>{userRankData.gamesWon}</Text>
                      <Text style={styles.statPillLabel}>Games Won</Text>
                    </View>

                    <View style={[styles.statPill, { backgroundColor: "#ECFDF5", marginRight: 8 }]}>
                      <Coins color="#27AE60" size={24} />
                      <Text style={styles.statPillNumber}>{userRankData.celoEarned.replace("+", "")}</Text>
                      <Text style={styles.statPillLabel}>CELO Earned</Text>
                    </View>

                    <View style={[styles.statPill, { backgroundColor: "#FFFBEB" }]}>
                      <Zap color="#F39C12" size={24} />
                      <Text style={styles.statPillNumber}>{userRankData.winStreak}</Text>
                      <Text style={styles.statPillLabel}>Win Streak</Text>
                    </View>
                  </View>
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