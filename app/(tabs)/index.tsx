import '@walletconnect/react-native-compat';
import { Image } from 'expo-image';
import React, { useState, useCallback } from 'react';
import { Text } from 'react-native';

import { Clock, Coins, Play, Star, Trophy, X } from "lucide-react-native";
import { Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { ModalController } from '@reown/appkit-core-react-native';
import featuredData from "../../data/featuredGames.json";
import categoriesData from "../../data/gameCategories.json";
import globalStyles from "../../styles/global.styles"; 
import { useRouter } from 'expo-router';
import { Game } from '@/models/Game';
import { storage } from '@/utils/StorageUtil';
import { USER_PROFILE_KEY } from '@/constants/storageKeys';
import { useFocusEffect } from '@react-navigation/native';
import { sendToMasterWallet } from '@/utils/WalletTransfer';
import { useAccount, useWalletClient } from 'wagmi';
import { getUserStats, UserStats } from '@/utils/GameHistory';

const styles = globalStyles;

export default function HomeScreen() {
  const router = useRouter();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('Player');
  const [stats, setStats] = useState<UserStats>({ totalGames: 0, wins: 0, losses: 0 });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [profile, loadedStats] = await Promise.all([
            storage.getItem<{ username?: string; fullName?: string }>(USER_PROFILE_KEY),
            getUserStats(),
          ]);
          if (!active) return;
          const candidate = profile?.username?.trim() || profile?.fullName?.trim();
          setDisplayName(candidate && candidate.length > 0 ? candidate : 'Player');
          setStats(loadedStats);
        } catch (err) {
          if (active) {
            setDisplayName('Player');
            setStats({ totalGames: 0, wins: 0, losses: 0 });
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const featuredGames: Game[] = featuredData.featuredGames ?? [];
  
  const gameCategories = categoriesData.gameCategories ?? [];

  const gamesPlayed = stats.totalGames;
  const gamesWon = stats.wins;
  const gamesLost = stats.losses;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const handleGamePress = (game: any) => {
    setSelectedGame(game);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (overrideAmount?: string) => {
    setShowPaymentModal(false);
    if (!selectedGame) return;

    const normalizedOverride = typeof overrideAmount === 'string' ? overrideAmount.trim() : '';
    const normalizedAmount = typeof selectedGame?.amount === 'string' ? selectedGame.amount.trim() : '';
    const normalizedEntryFee = typeof selectedGame?.entryFee === 'string' ? selectedGame.entryFee.trim() : '';
    const normalizedEntry = typeof selectedGame?.entry === 'string' ? selectedGame.entry.trim() : '';

    const paidAmount = normalizedOverride || normalizedAmount || normalizedEntryFee || normalizedEntry;

    if (paidAmount.length > 0) {
      if (address) {
        try {
          await sendToMasterWallet({ amount: paidAmount, from: address, walletClient });
        } catch (err) {
          console.warn('Transfer to master wallet failed', err);
        }
      } else {
        console.warn('Cannot send payment to master wallet: no connected wallet address');
      }
    }
    const params = {
      fromPayment: 'true',
      title: typeof selectedGame.title === 'string' ? selectedGame.title : '',
      amount: paidAmount,
      entry: paidAmount,
      reward: typeof selectedGame.reward === 'string' ? selectedGame.reward : '',
    };

    switch (String(selectedGame.id)) {
      case '1':
        router.push({ pathname: '/games/puzzle-game', params });
        break;
      case '2':
        router.push({ pathname: '/games/card-match', params });
        break;
      case '3':
        router.push({ pathname: '/games/puzzle-game', params });
        break;
      case '4':
        router.push({ pathname: '/games/quiz-game', params });
        break;
    }
  };

  return (
      <View style={globalStyles.appContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={{ color: "#111827", opacity: 0.7, fontSize: 12 }}>Welcome back</Text>
              <Text style={{ color: "#111827", fontSize: 20, fontWeight: "700", marginBottom: 4 }}>{displayName}</Text>
            </View>

            <View style={styles.balanceBadge}>
              <TouchableOpacity onPress={() => ModalController.open()} style={{ padding: 6 }}>
                <Coins color="#FFD166" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.countdownBanner}>
            <View>
              <Text style={{ color: "#000000", fontSize: 12 }}>Next Daily Challenge</Text>
              <Text style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}>{featuredGames?.[0]?.timeLeft ?? "00:00:00"}</Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: 10, borderRadius: 12 }}>
              <Clock color="#000000" size={20} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={[globalStyles.pagePadding]} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Featured Games Carousel */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Featured Games</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 1, paddingVertical: 8 }}
        >
          {featuredGames.map((game) => (
            <TouchableOpacity
              key={game.id}
              onPress={() => handleGamePress(game)}
              style={[styles.card, { marginRight: 16 }]}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: game.image }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.rewardBadge}>
                <Star color="#FFFFFF" size={12} />
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
                  {game.reward}
                </Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardType}>{game.type}</Text>
                <Text style={styles.cardTitle}>{game.title}</Text>
                <View style={styles.cardInfoRow}>
                  <View style={styles.infoLeft}>
                    <Clock color="#95A5A6" size={14} />
                    <Text style={styles.infoText}>{game.timeLeft}</Text>
                  </View>
                  <View style={styles.infoLeft}>
                    <Trophy color="#95A5A6" size={14} />
                    <Text style={styles.infoText}>{game.players} playing</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Game Categories Grid */}
        <View style={{ paddingHorizontal: 1, marginTop: 16, marginBottom: 1 }}>
          <View style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
              Explore Games
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 1 , paddingVertical: 8}}>
            {gameCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleGamePress(category)}
                style={styles.categoryCard}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: category.image }}
                  style={styles.categoryImage}
                  contentFit="cover"
                />
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: "#10B981", fontWeight: "700" }}>{category.reward}</Text>
                    <View style={styles.playButton}>
                      <Play color="#2563EB" size={14} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsWrapper}>
          <Text style={{ fontSize: 20, color: "#111827", fontWeight: "700", marginBottom: 10 }}>Your Stats</Text>
          <View style={styles.statsCardLarge}>
            <View style={styles.statsGridLarge}>
              <View style={styles.statBlock}>
                <View style={[styles.statIcon, { backgroundColor: "#E6F2FF" }]}>
                  <Play color="#2563EB" size={22} />
                </View>
                <Text style={styles.statNumberLarge}>{gamesPlayed}</Text>
                <Text style={styles.statLabelSmall}>Games Played</Text>
              </View>

              <View style={styles.statBlock}>
                <View style={[styles.statIcon, { backgroundColor: "#E6FAF0" }]}>
                  <Trophy color="#16A34A" size={22} />
                </View>
                <Text style={styles.statNumberLarge}>{gamesWon}</Text>
                <Text style={styles.statLabelSmall}>Games Won</Text>
              </View>

              <View style={styles.statBlock}>
                <View style={[styles.statIcon, { backgroundColor: "#FFF7ED" }]}>
                  <Star color="#F59E0B" size={22} />
                </View>
                <Text style={styles.statNumberLarge}>{winRate}%</Text>
                <Text style={styles.statLabelSmall}>Win Rate</Text>
              </View>

              <View style={styles.statBlock}>
                <View style={[styles.statIcon, { backgroundColor: "#FFF1F2" }]}>
                  <X color="#F43F5E" size={22} />
                </View>
                <Text style={styles.statNumberLarge}>{gamesLost}</Text>
                <Text style={styles.statLabelSmall}>Games Lost</Text>
              </View>
            </View>
          </View>
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
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.modalTitle}>Confirm Payment</Text>
                  <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ padding: 6 }}>
                    <X color="#111827" size={20} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>Join "{selectedGame?.title}"</Text>

                <View style={styles.modalContent}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Image
                      source={{ uri: selectedGame?.image }}
                      style={styles.gameImage}
                      contentFit="cover"
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.gameTitle}>{selectedGame?.title}</Text>
                      <Text style={styles.gameType}>{selectedGame?.type}</Text>
                    </View>
                  </View>

                  {/* Payment summary */}
                  <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ color: "#6B7280" }}>Amount</Text>
                      <Text style={{ fontWeight: "700" }}>{selectedGame?.amount ?? "0 R"}</Text>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "#6B7280" }}>Reward</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Coins color="#F59E0B" size={16} />
                        <Text style={{ fontWeight: "700", marginLeft: 8 }}> {selectedGame?.reward ?? selectedGame?.subtitle ?? "R 0"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => setShowPaymentModal(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleConfirmPayment(selectedGame?.amount)}
                      style={styles.confirmButton}
                    >
                      <Text style={styles.confirmButtonText}>Pay {selectedGame?.amount ?? "R 0"}</Text>
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
