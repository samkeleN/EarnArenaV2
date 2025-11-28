import { useRouter } from 'expo-router';
import { ArrowUpDown, Clock, Coins, Filter, Search, Star, Users, X } from "lucide-react-native";
import React, { useState } from "react";
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import globalStyles from "../../styles/global.styles";

import mockGameData from "../../data/mockGame.json";

const mockGames = mockGameData.mockGameData;

// Categories data
const categories = [
  { id: "all", title: "All Games", count: mockGames.length },
  { id: "featured", title: "Featured", count: mockGames.filter(g => g.category === "Featured").length },
  { id: "cards", title: "Cards", count: mockGames.filter(g => g.category === "Cards").length },
  { id: "puzzle", title: "Puzzle", count: mockGames.filter(g => g.category === "Puzzle").length },
  { id: "quiz", title: "Quiz", count: mockGames.filter(g => g.category === "Quiz").length },
  { id: "speed", title: "Speed", count: mockGames.filter(g => g.category === "Speed").length },
];

// Difficulty levels
const difficulties = [
  { id: "all", title: "All Levels" },
  { id: "easy", title: "Easy" },
  { id: "medium", title: "Medium" },
  { id: "hard", title: "Hard" },
];

export default function GamesLibraryScreen() {
  const styles = globalStyles;
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const openPaymentModal = (game: any) => {
    setSelectedGame(game);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (amount?: string) => {
    setShowPaymentModal(false);
    console.log("Payment confirmed for:", selectedGame?.title, "amount:", amount ?? (selectedGame?.reward ?? "0 CELO"));

    try {
      // Match Cards -> card-match (id 2)
      if (selectedGame?.id === 1 || selectedGame?.id === '1') {
        router.push('/games/quiz-game?fromPayment=true');
      }
      
      // Puzzle games -> puzzle-game (id 2)
      if (selectedGame?.id === 2 || selectedGame?.id === '2') {
        router.push('/games/puzzle-game?fromPayment=true');
      }
      // Match Cards -> card-match (id 3)
      if (selectedGame?.id === 3 || selectedGame?.id === '3') {
        router.push('/games/card-match?fromPayment=true');
      }
    } catch (err) {
      console.warn('Navigation after payment failed', err);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("popular"); // popular, reward, newest
  const [showFilters, setShowFilters] = useState(false);

  // Filter games based on search, category, and difficulty
  const filteredGames = mockGames.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         game.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           game.category.toLowerCase() === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || 
                             game.difficulty.toLowerCase() === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Sort games
  const sortedGames = [...filteredGames].sort((a, b) => {
    if (sortBy === "reward") {
      const rewardA = parseFloat(a.reward.replace("R", ""));
      const rewardB = parseFloat(b.reward.replace("R", ""));
      return rewardB - rewardA;
    } else if (sortBy === "newest") {
      return parseInt(b.id) - parseInt(a.id);
    }
    // Default sort by popularity (players count)
    const playersA = parseFloat(a.players.replace("K", "")) * (a.players.includes("K") ? 1000 : 1);
    const playersB = parseFloat(b.players.replace("K", "")) * (b.players.includes("K") ? 1000 : 1);
    return playersB - playersA;
  });

  // Get most played games (top 4 by player count)
  const mostPlayedGames = [...mockGames]
    .sort((a, b) => {
      const playersA = parseFloat(a.players.replace("K", "")) * (a.players.includes("K") ? 1000 : 1);
      const playersB = parseFloat(b.players.replace("K", "")) * (b.players.includes("K") ? 1000 : 1);
      return playersB - playersA;
    })
    .slice(0, 4);

  return (
    <View style={styles.appContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerRow, { marginBottom: 12 }]}>
          <View>
            <Text style={{ color: "#111827", fontSize: 20, fontWeight: "700" }}>Game Library</Text>
          </View>

          <View style={styles.balanceBadge}>
            <Star color="#FFD700" size={18} />
            {/* <Text style={{ color: "#0F172A", fontWeight: "700" }}>20 CELO</Text> */}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search color="#000000" size={18} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: "#111827" }}
            placeholder="Search games..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ maxHeight: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginRight: 8,
                borderRadius: 999,
                backgroundColor: selectedCategory === category.id ? '#2563EB' : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '600', color: selectedCategory === category.id ? '#FFFFFF' : '#6B7280' }}>
                {category.title} ({category.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters Section */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Filter color="#3498db" size={18} />
              <Text style={{ color: '#2563EB', fontWeight: '600', marginLeft: 8 }}>Filters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSortBy(sortBy === "popular" ? "reward" : sortBy === "reward" ? "newest" : "popular")}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <ArrowUpDown color="#3498db" size={18} />
              <Text style={{ color: '#2563EB', fontWeight: '600', marginLeft: 8 }}>
                {sortBy === "popular" ? "Popular" : sortBy === "reward" ? "Reward" : "Newest"}
              </Text>
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#0F172A', fontWeight: '700', marginBottom: 8 }}>Difficulty Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {difficulties.map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.id}
                    onPress={() => setSelectedDifficulty(difficulty.id)}
                    style={[
                      styles.difficultyPill,
                      { marginRight: 8 },
                      selectedDifficulty === difficulty.id
                        ? styles.difficultyEasy // reuse easy color for selected to keep contrast; adjust if needed
                        : { backgroundColor: '#F8FAFC' },
                    ]}
                  >
                    <Text style={selectedDifficulty === difficulty.id ? styles.difficultyTextEasy : { color: '#0F172A', fontSize: 12, fontWeight: '600' }}>
                      {difficulty.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Most Played Section */}
        <View style={styles.pagePadding}>
          <View style={[styles.headerRow, { marginBottom: 12 }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
              Most Played
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 1 }}
            style={{ maxHeight: 180,paddingBottom: 8, paddingLeft: 1 }}
          >
            {mostPlayedGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.mostPlayedCard, { marginRight: 12 }]}
                onPress={() => openPaymentModal(game)}
              >
                <Image
                  source={{ uri: game.image }}
                  style={{ width: "100%", height: 96 }}
                  resizeMode="cover"
                />
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                    {game.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Users color="#95A5A6" size={12} />
                      <Text style={styles.infoText}>{game.players}</Text>
                    </View>
                    <View style={{ backgroundColor: "#10B981", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
                      <Star color="#FFFFFF" size={10} fill="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginLeft: 6 }}>{game.reward}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Games Section */}
        <View style={[styles.pagePadding, { marginTop: 16, marginBottom: 24 }]}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12 }}>
            Explore More
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            {sortedGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.categoryCard}
                onPress={() => openPaymentModal(game)}
              >
                <Image
                  source={{ uri: game.image }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
                <View style={styles.rewardBadge}>
                  <Star color="#FFFFFF" size={12} fill="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginLeft: 6 }}>{game.reward}</Text>
                </View>
                <View style={styles.categoryContent}>
                  <Text style={styles.cardType}>{game.type}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{game.title}</Text>

                  <View style={styles.cardInfoRow}>
                    <View style={styles.infoLeft}>
                      <Users color="#95A5A6" size={14} />
                      <Text style={styles.infoText}>{game.players}</Text>
                    </View>
                    <View style={[styles.difficultyPill, game.difficulty === "Easy" ? styles.difficultyEasy : game.difficulty === "Medium" ? styles.difficultyMedium : styles.difficultyHard]}>
                      <Text style={game.difficulty === "Easy" ? styles.difficultyTextEasy : game.difficulty === "Medium" ? styles.difficultyTextMedium : styles.difficultyTextHard}>{game.difficulty}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <Clock color="#95A5A6" size={14} />
                    <Text style={[styles.infoText, { marginLeft: 6 }]}>{game.timeRemaining}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {sortedGames.length === 0 && (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
              <Text style={{ color: "#6B7280", fontSize: 18 }}>No games found</Text>
              <Text style={{ color: "#94A3B8", marginTop: 8 }}>
                Try adjusting your filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPaymentModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => { /* prevent backdrop taps when interacting with modal */ }}>
              <View style={styles.modalContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.modalTitle}>Confirm Payment</Text>
                  <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ padding: 6 }}>
                    <X color="#111827" size={20} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>Join "{selectedGame?.title}"</Text>

                <View style={styles.modalContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Image
                      source={{ uri: selectedGame?.image }}
                      style={styles.gameImage}
                      resizeMode="cover"
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.gameTitle}>{selectedGame?.title}</Text>
                      <Text style={styles.gameType}>{selectedGame?.type}</Text>
                    </View>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: '#6B7280' }}>Amount</Text>
                      <Text style={{ fontWeight: '700' }}>{selectedGame?.reward ?? '0 CELO'}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#6B7280' }}>Your Balance</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Coins color="#F59E0B" size={16} />
                        <Text style={{ fontWeight: '700', marginLeft: 8 }}>20 CELO</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleConfirmPayment()} style={styles.confirmButton}>
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}