import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Clock, Star, Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { recordGameResult } from '@/utils/GameHistory';

import { useAccount, useWalletClient } from 'wagmi';
import { rewardPlayerForGameWin } from '@/utils/RewardWorkflow';

// Using StyleSheet for styling instead of nativewind `className`.-
// Quiz question type
type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
};

// Mock quiz data
const quizData: QuizQuestion[] = [
  { id: 1, question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correctAnswer: 2 },
  { id: 2, question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: 1 },
  { id: 3, question: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correctAnswer: 1 },
  { id: 4, question: "Which element has the chemical symbol 'O'?", options: ["Gold", "Oxygen", "Osmium", "Oganesson"], correctAnswer: 1 },
  { id: 5, question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], correctAnswer: 2 }
];

export default function QuizGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [gameOver, setGameOver] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);
  const recordedRef = useRef(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const currentQuestion = quizData[currentQuestionIndex];

  const gameTitle = useMemo(() => {
    const raw = typeof params?.title === 'string' ? params.title.trim() : '';
    return raw.length > 0 ? raw : 'Quiz Game';
  }, [params?.title]);

  const rewardDisplay = useMemo(() => {
    const raw = typeof params?.reward === 'string' ? params.reward.trim() : '';
    return raw.length > 0 ? raw : '1 CELO';
  }, [params?.reward]);

  const paymentAmount = useMemo(() => {
    const amountRaw = typeof params?.amount === 'string' ? params.amount.trim() : '';
    if (amountRaw.length > 0) return amountRaw;
    const legacyEntry = typeof params?.entry === 'string' ? params.entry.trim() : '';
    return legacyEntry.length > 0 ? legacyEntry : '0';
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

  const logOutcome = useCallback(async (outcome: 'win' | 'loss') => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    if (outcome === 'win') {
      try {
        await rewardWin();
      } catch (err) {
        console.warn('Failed to reward quiz winner', err);
        Alert.alert("Reward Pending", err instanceof Error ? err.message : "Unable to start reward transaction.");
      }
      return;
    }

    const amount = paymentAmount;
    try {
      await recordGameResult({ gameName: gameTitle, outcome, amount });
    } catch (err) {
      console.warn('Failed to record quiz result', err);
    }

  }, [address, gameTitle, paymentAmount, rewardWin, router, walletClient]);
  const logOutcomeRef = useRef(logOutcome);

  useEffect(() => {
    logOutcomeRef.current = logOutcome;
  }, [logOutcome]);

  const handleExit = useCallback(() => {
    void logOutcome('loss');
    router.back();
  }, [logOutcome, router]);

  useEffect(() => {
    recordedRef.current = false;
  }, []);

  // If navigated here after payment, show a short acknowledgement and clear the query param
  useEffect(() => {
    const fromPayment = params?.fromPayment === 'true' || params?.from === 'payment';
    if (fromPayment) {
      setShowPaymentNotice(true);
      // reset timer to full for new question
      setTimeLeft(30);
      const t = setTimeout(() => setShowPaymentNotice(false), 2200);
      try {
        router.replace('/games/quiz-game');
      } catch (err) {
        // ignore
      }
      return () => clearTimeout(t);
    }
  }, [params, router]);

  // Timer effect
  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, gameOver, isAnswered]);

  const handleTimeUp = useCallback(() => {
    setIsAnswered(true);
    setTimeout(() => {
      moveToNextQuestion();
    }, 1500);
  }, [currentQuestionIndex]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    if (optionIndex === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
    setTimeout(() => moveToNextQuestion(), 1500);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(30);
    } else {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    recordedRef.current = false;
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsAnswered(false);
  };

  useEffect(() => {
    if (!gameOver) return;
    const threshold = Math.ceil(quizData.length * 0.6);
    const outcome = score >= threshold ? 'win' : 'loss';
    void logOutcome(outcome);
  }, [gameOver, logOutcome, score]);

  useEffect(() => {
    return () => {
      void logOutcomeRef.current('loss');
    };
  }, []);

  const getOptionStyle = (index: number) => {
    if (!isAnswered) return [localStyles.optionButton, localStyles.optionDefault];
    if (index === currentQuestion.correctAnswer) return [localStyles.optionButton, localStyles.optionCorrect];
    if (index === selectedOption && index !== currentQuestion.correctAnswer) return [localStyles.optionButton, localStyles.optionWrong];
    return [localStyles.optionButton, localStyles.optionDisabled];
  };

  const getOptionTextStyle = (index: number) => {
    if (!isAnswered) return localStyles.optionTextDefault;
    if (index === currentQuestion.correctAnswer) return localStyles.optionTextCorrect;
    if (index === selectedOption && index !== currentQuestion.correctAnswer) return localStyles.optionTextWrong;
    return localStyles.optionTextDisabled;
  };

  if (gameOver) {
    return (
      <LinearGradient colors={['#3498db', '#8e44ad']} className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-8 items-center shadow-lg w-full max-w-md">
            <Trophy size={80} color="#f1c40f" className="mb-6" />
            <Text className="text-3xl font-bold text-gray-800 mb-2">Quiz Completed!</Text>
            <Text className="text-xl text-gray-600 mb-6">Your final score:</Text>
            <View className="flex-row items-center mb-8">
              <Star size={40} color="#f1c40f" fill="#f1c40f" />
              <Text className="text-5xl font-bold text-gray-800 ml-3">{score}/{quizData.length}</Text>
            </View>
            <View className="flex-row gap-4 w-full">
              <TouchableOpacity className="flex-1 bg-gray-200 py-4 rounded-2xl items-center" onPress={handleExit}>
                <Text className="text-gray-800 font-bold text-lg">Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-blue-500 py-4 rounded-2xl items-center" onPress={resetGame}>
                <Text className="text-white font-bold text-lg">Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={localStyles.container}>
      {/* Header */}
      <LinearGradient colors={['#3498db', '#5dade2']} style={localStyles.headerGradient}>
        <View style={localStyles.headerRow}>
          <TouchableOpacity style={localStyles.backButton} onPress={handleExit}>
            <ChevronLeft size={28} color="white" />
            <Text style={localStyles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={localStyles.timePill}>
            <Clock size={20} color="white" />
            <Text style={localStyles.timeText}>{timeLeft}s</Text>
          </View>

          <View>
            <Text style={localStyles.headerCount}>{currentQuestionIndex + 1}/{quizData.length}</Text>
          </View>
        </View>

        <View style={localStyles.questionCard}>
          <Text style={localStyles.questionLabel}>Question {currentQuestionIndex + 1}</Text>
          <Text style={localStyles.questionText}>{currentQuestion.question}</Text>
        </View>
      </LinearGradient>

      {/* Short payment acknowledgement */}
      {showPaymentNotice && (
        <View style={{ position: 'absolute', top: 110, left: 16, right: 16, backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', zIndex: 30 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Payment confirmed — good luck!</Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={localStyles.progressBarBg}>
        <View style={[localStyles.progressBarFill, { width: `${((currentQuestionIndex + 1) / quizData.length) * 100}%` }]} />
      </View>

      {/* Options */}
      <ScrollView style={localStyles.optionsScroll}>
        <View style={localStyles.optionsList}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(index)}
              onPress={() => handleOptionSelect(index)}
              disabled={isAnswered}
            >
              <View style={localStyles.optionRow}>
                <View style={localStyles.optionLabelCircle}>
                  <Text style={localStyles.optionLabelText}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={getOptionTextStyle(index)}>{option}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Score display */}
      <View style={localStyles.scoreBar}>
        <View style={localStyles.scoreRow}>
          <Text style={localStyles.scoreLabel}>Current Score:</Text>
          <View style={localStyles.scoreWrap}>
            <Star size={20} color="#f1c40f" fill="#f1c40f" />
            <Text style={localStyles.scoreText}>{score}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#FFFFFF', fontSize: 16, marginLeft: 6 },
  timePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(37,99,235,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 },
  timeText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },
  headerCount: { color: '#FFFFFF', fontSize: 16 },
  questionCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 12, marginTop: 6 },
  questionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  questionText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 8 },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB' },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 8 },
  optionsScroll: { flex: 1, padding: 16 },
  optionsList: { gap: 12 },
  optionButton: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1, marginBottom: 8 },
  optionDefault: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  optionDisabled: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  optionCorrect: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#10B981' },
  optionWrong: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
  optionLabelCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLabelText: { color: '#2563EB', fontWeight: '700' },
  optionTextDefault: { color: '#111827', fontSize: 16 },
  optionTextDisabled: { color: '#6B7280', fontSize: 16 },
  optionTextCorrect: { color: '#065F46', fontSize: 16, fontWeight: '700' },
  optionTextWrong: { color: '#991B1B', fontSize: 16, fontWeight: '700' },
  scoreBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { color: '#6B7280' },
  scoreWrap: { flexDirection: 'row', alignItems: 'center' },
  scoreText: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
});
