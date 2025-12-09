import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, CheckCircle, Clock, Coins, RotateCcw, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import globalStyles, { theme } from "../../styles/global.styles";
import { recordGameResult } from "@/utils/GameHistory";
import { useAccount, useWalletClient } from "wagmi";
import { rewardPlayerForGameWin } from "@/utils/RewardWorkflow";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 60) / 4;

// Card symbols - using emojis for simplicity
const CARD_SYMBOLS = [
  "🍎", "🍌", "🍇",
  "🍊", "🍓", "🍒",
  "🍑", "🍍", "🥥", 
  "🥝", "🥭", "🍉",
  "🍋", "🍈", "🍐",
  "🍅",
];

interface Card {
  id: string;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function CardMatchGame() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);
  const recordedRef = useRef(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const gameTitle = useMemo(() => {
    const raw = typeof params?.title === "string" ? params.title.trim() : "";
    return raw.length > 0 ? raw : "Card Match";
  }, [params?.title]);

  const rewardDisplay = useMemo(() => {
    const raw = typeof params?.reward === "string" ? params.reward.trim() : "";
    return raw.length > 0 ? raw : "0.5 CELO";
  }, [params?.reward]);

  const paymentAmount = useMemo(() => {
    const amountRaw = typeof params?.amount === "string" ? params.amount.trim() : "";
    if (amountRaw.length > 0) return amountRaw;
    const legacyEntry = typeof params?.entry === "string" ? params.entry.trim() : "";
    if (legacyEntry.length > 0) return legacyEntry;
    return "0";
  }, [params?.amount, params?.entry]);

  const rewardWin = useCallback(async () => {
    if (!address) {
      throw new Error("Connect your wallet to receive rewards.");
    }

    await rewardPlayerForGameWin({
      gameName: gameTitle,
      rewardAmount: rewardDisplay,
      playerWalletAddress: address,
      walletClient,
    });
  }, [address, gameTitle, rewardDisplay, walletClient]);

  const recordOutcome = useCallback(async (outcome: "win" | "loss") => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    if (outcome === "win") {
      try {
        await rewardWin();
      } catch (err) {
        console.warn("Failed to reward winner", err);
        Alert.alert("Reward Pending", err instanceof Error ? err.message : "Unable to start reward transaction.");
      }
      return;
    }

    const amount = paymentAmount;
    try {
      await recordGameResult({
        gameName: gameTitle,
        outcome,
        amount,
      });
    } catch (err) {
      console.warn("Failed to record game result", err);
    }

  }, [address, gameTitle, paymentAmount, rewardWin, router, walletClient]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initialize the game
  const initializeGame = () => {
    recordedRef.current = false;
    clearTimer();
    const selectedSymbols = CARD_SYMBOLS.slice(0, 8); // 8 unique symbols for 16 cards
    const cardPairs = [...selectedSymbols, ...selectedSymbols];

    const shuffledCards = [...cardPairs]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: `card-${index}`,
        symbol,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setTimeLeft(60);
    setGameOver(false);
    setGameWon(false);
    setShowResultModal(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  // If navigated here after payment, you can show the game or a quick confirmation
  useEffect(() => {
    const fromPayment = params?.fromPayment === "true" || params?.from === "payment";
    if (fromPayment) {
      // Show a short acknowledgement instead of the result modal (which indicates win/lose)
      setShowPaymentNotice(true);
      // hide after a short delay
      const t = setTimeout(() => setShowPaymentNotice(false), 2500);
      // clear the query param so re-entering later doesn't retrigger
      try {

        router.replace('/games/card-match');
      } catch (err) {
        // ignore router errors in some environments
      }
      return () => clearTimeout(t);
    }
  }, [params, router]);

  // Timer countdown
  useEffect(() => {
    clearTimer();

    if (!isPlaying || gameOver) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [isPlaying, gameOver, timeLeft, clearTimer]);

  // Check for matches when two cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2) {
      // mark we're checking a pair so taps are ignored until resolved
      setIsChecking(true);
      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find((card) => card.id === firstId);
      const secondCard = cards.find((card) => card.id === secondId);

      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        // Match found
        setCards((prevCards) =>
          prevCards.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true }
              : card
          )
        );

        // Check if all cards are matched
        const allMatched =
          cards.filter((card) => card.id !== firstId && card.id !== secondId).every((card) => card.isMatched) && cards.length > 0;

        if (allMatched) {
          handleGameWin();
        }

        // small timeout to allow UI update before unlocking input
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 200);
      } else {
        // No match - flip cards back after delay
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((card) =>
              card.id === firstId || card.id === secondId ? { ...card, isFlipped: false } : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 800);
      }

      setMoves((prev) => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flippedCards]);

  const handleCardPress = (cardId: string) => {
    // prevent interaction while checking a pair, or after game ended
    if (gameOver || gameWon || isChecking) return;

    // do not allow more than two selections
    if (flippedCards.length >= 2) return;

    // prevent selecting a card that's already flipped/matched or already selected
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.includes(cardId)) return;

    // flip locally and add to the selected list
    setCards((prevCards) =>
      prevCards.map((card) => (card.id === cardId ? { ...card, isFlipped: true } : card))
    );

    setFlippedCards((prev) => [...prev, cardId]);
  };

  const handleTimeUp = () => {
    clearTimer();
    setGameOver(true);
    setGameWon(false);
    setIsPlaying(false);
    setShowResultModal(true);
    void recordOutcome("loss");
  };

  const handleGameWin = () => {
    clearTimer();
    setGameOver(true);
    setGameWon(true);
    setIsPlaying(false);
    setShowResultModal(true);
    void recordOutcome("win");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handlePlayAgain = () => {
    initializeGame();
  };

  const navigateHome = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setShowResultModal(false);
    router.push("/(tabs)");
  }, [clearTimer, router]);

  const handleConfirmedExit = useCallback(() => {
    void (async () => {
      try {
        await recordOutcome("loss");
      } catch (err) {
        console.warn("Failed to record manual exit", err);
      } finally {
        navigateHome();
      }
    })();
  }, [navigateHome, recordOutcome]);

  const handleBackToHome = useCallback(() => {
    if (gameOver) {
      navigateHome();
      return;
    }

    Alert.alert(
      "Leave Game?",
      "If you exit now, this game will be marked as lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: handleConfirmedExit },
      ],
    );
  }, [gameOver, handleConfirmedExit, navigateHome]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <View style={[globalStyles.appContainer, localStyles.screen]}> 
      {/* Header */}
      <View style={[localStyles.header, { backgroundColor: theme.colors.primary }]}> 
        <View style={localStyles.headerRow}>
          <Text style={localStyles.headerTitle}>Card Match</Text>
          <TouchableOpacity onPress={handleBackToHome} style={localStyles.iconButton}>
            <X color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>

        {/* Game Stats */}
        <View style={localStyles.statsRow}>
          <View style={localStyles.statPill}>
            <Clock color="#FFFFFF" size={18} />
            <Text style={localStyles.statText}>{formatTime(timeLeft)}</Text>
          </View>

          <View style={localStyles.statPill}>
            <Text style={localStyles.statText}>Moves: {moves}</Text>
          </View>
        </View>
      </View>
      {/* Short payment acknowledgement (when navigated here after payment) */}
      {showPaymentNotice && (
        <View style={localStyles.paymentNotice}>
          <Text style={localStyles.paymentNoticeText}>Payment confirmed — good luck!</Text>
        </View>
      )}

      {/* Game Board */}
      <ScrollView contentContainerStyle={localStyles.boardWrapper}>
        <View style={localStyles.board}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => handleCardPress(card.id)}
              style={[
                localStyles.cardBase,
                card.isMatched ? localStyles.cardMatched : localStyles.cardHidden,
                (card.isFlipped || card.isMatched) && localStyles.cardFlipped,
              ]}
            >
              {card.isFlipped || card.isMatched ? (
                <Text style={localStyles.symbol}>{card.symbol}</Text>
              ) : (
                <View style={localStyles.hiddenInner}>
                  <Text style={localStyles.hiddenQuestion}>?</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={showResultModal} transparent animationType="fade">
        <View style={localStyles.resultBackdrop}>
          <View style={localStyles.resultCard}>
            <View style={[localStyles.resultHeader, gameWon ? { backgroundColor: "#10B981" } : { backgroundColor: "#EF4444" }]}> 
              {gameWon ? (
                <CheckCircle color="#FFFFFF" size={48} />
              ) : (
                <AlertCircle color="#FFFFFF" size={48} />
              )}
              <Text style={localStyles.resultTitle}>{gameWon ? "Congratulations!" : "Time's Up!"}</Text>
            </View>

            <View style={localStyles.resultContent}>
              <View style={localStyles.resultInner}>
                {gameWon ? (
                  <>
                    <Text style={localStyles.resultHeading}>You Won!</Text>
                    <Text style={localStyles.resultSub}>You matched all cards in {moves} moves with {timeLeft} seconds remaining.</Text>
                    <View style={localStyles.rewardRow}>
                      <Coins color="#F39C12" size={32} />
                      <Text style={localStyles.rewardText}>+{rewardDisplay}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={localStyles.resultHeading}>Game Over</Text>
                    <Text style={localStyles.resultSub}>You didn't complete the game in time. Try again!</Text>
                    <View style={localStyles.rewardRowAlt}>
                      <Coins color="#95A5A6" size={32} />
                      <Text style={localStyles.rewardTextAlt}>No Reward</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={localStyles.actionsRow}>
                <TouchableOpacity style={localStyles.primaryButton} onPress={handlePlayAgain}>
                  <RotateCcw color="#FFFFFF" size={18} />
                  <Text style={localStyles.primaryButtonText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={localStyles.secondaryButton} onPress={handleBackToHome}>
                  <Text style={localStyles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 8,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 8,
  },
  boardWrapper: {
    padding: 16,
    paddingBottom: 32,
  },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  cardBase: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
    elevation: 2,
  },
  cardHidden: {
    backgroundColor: "#60A5FA",
  },
  cardFlipped: {
    backgroundColor: "#E6F2FF",
  },
  cardMatched: {
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  symbol: {
    fontSize: 28,
  },
  hiddenInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenQuestion: {
    fontSize: 20,
    color: "#1E3A8A",
    fontWeight: "700",
  },
  resultBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  resultCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  resultHeader: {
    padding: 20,
    alignItems: "center",
  },
  resultTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  resultContent: {
    padding: 18,
  },
  resultInner: {
    alignItems: "center",
    marginBottom: 12,
  },
  resultHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  resultSub: {
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
  },
  rewardText: {
    color: "#F59E0B",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },
  rewardRowAlt: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  rewardTextAlt: {
    color: "#6B7280",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },
  actionsRow: {
    marginTop: 6,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  paymentNotice: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 30,
  },
  paymentNoticeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
