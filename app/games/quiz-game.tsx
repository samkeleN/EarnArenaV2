import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, ChevronLeft, Clock, Star, Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, StyleSheet, Animated, Easing } from 'react-native';
import { recordGameResult } from '@/utils/GameHistory';

import { useAccount } from 'wagmi';

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
  const resultAnim = useRef(new Animated.Value(0)).current;
  const { address } = useAccount();

  const currentQuestion = quizData[currentQuestionIndex];

  const gameTitle = useMemo(() => {
    const raw = typeof params?.title === 'string' ? params.title.trim() : '';
    return raw.length > 0 ? raw : 'Quiz Game';
  }, [params?.title]);

  const rewardDisplay = useMemo(() => {
    const raw = typeof params?.reward === 'string' ? params.reward.trim() : '';
    return raw.length > 0 ? raw : '0.0003 CELO';
  }, [params?.reward]);

  const paymentAmount = useMemo(() => {
    const amountRaw = typeof params?.amount === 'string' ? params.amount.trim() : '';
    if (amountRaw.length > 0) return amountRaw;
    const legacyEntry = typeof params?.entry === 'string' ? params.entry.trim() : '';
    return legacyEntry.length > 0 ? legacyEntry : '0';
  }, [params?.amount, params?.entry]);

  const gameIdParam = useMemo(() => {
    if (typeof params?.gameId === 'string' && params.gameId.trim().length > 0) {
      return params.gameId.trim();
    }
    if (typeof params?.id === 'string' && params.id.trim().length > 0) {
      return params.id.trim();
    }
    return null;
  }, [params?.gameId, params?.id]);

  const logOutcome = useCallback(async (outcome: 'win' | 'loss') => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    const amount = outcome === 'win' ? rewardDisplay : paymentAmount;
    const statusProps = outcome === 'win'
      ? { status: 'pending' as const, statusMessage: 'Awaiting manual payout' }
      : {};

    try {
      await recordGameResult({
        gameName: gameTitle,
        outcome,
        amount,
        playerAddress: address ?? null,
        gameId: gameIdParam,
        ...statusProps,
      });
      if (outcome === 'win') {
        Alert.alert('Win Logged', 'Great job! Your win has been recorded for manual payout.');
      }
    } catch (err) {
      console.warn('Failed to record quiz result', err);
    }

  }, [address, gameIdParam, gameTitle, paymentAmount, rewardDisplay]);

  const exitWithoutLogging = useCallback(() => {
    router.back();
  }, [router]);

  const handleConfirmedExit = useCallback(() => {
    void (async () => {
      try {
        await logOutcome('loss');
      } catch (err) {
        console.warn('Failed to record manual quiz exit', err);
      } finally {
        exitWithoutLogging();
      }
    })();
  }, [exitWithoutLogging, logOutcome]);

  const handleExit = useCallback(() => {
    if (gameOver) {
      exitWithoutLogging();
      return;
    }

    Alert.alert(
      'Leave Game?',
      'If you exit now, this game will be marked as lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: handleConfirmedExit },
      ],
    );
  }, [exitWithoutLogging, gameOver, handleConfirmedExit]);

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
    resultAnim.setValue(0);
  };

  useEffect(() => {
    if (!gameOver) return;
    Animated.timing(resultAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
    const allCorrect = score === quizData.length;
    void logOutcome(allCorrect ? 'win' : 'loss');
  }, [gameOver, logOutcome, quizData.length, resultAnim, score]);

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
    const allCorrect = score === quizData.length;
    const gradientColors = allCorrect
      ? (['#047857', '#16A34A'] as const)
      : (['#991B1B', '#EF4444'] as const);
    const iconColor = '#FFFFFF';
    const scale = resultAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <LinearGradient colors={gradientColors} style={localStyles.resultGradient}>
        <Animated.View style={[localStyles.resultCard, { transform: [{ scale }] }]}> 
          <View style={[localStyles.resultHeader, allCorrect ? localStyles.resultHeaderWin : localStyles.resultHeaderLose]}>
            {allCorrect ? (
              <CheckCircle2 size={60} color={iconColor} />
            ) : (
              <AlertCircle size={60} color={iconColor} />
            )}
            <Text style={localStyles.resultTitle}>{allCorrect ? 'Perfect Score!' : 'Better Luck Next Time'}</Text>
            <Text style={localStyles.resultSubtitle}>
              {allCorrect
                ? `You mastered all ${quizData.length} questions.`
                : 'A single miss keeps the streak alive for next round.'}
            </Text>
          </View>

          <View style={localStyles.resultBody}>
            <View style={localStyles.scoreSummary}>
              <Star size={32} color={allCorrect ? '#10B981' : '#EF4444'} fill={allCorrect ? '#10B981' : '#EF4444'} />
              <Text style={localStyles.scoreText}>{score}/{quizData.length}</Text>
            </View>
            <View style={localStyles.resultButtons}>
              <TouchableOpacity style={localStyles.secondaryButton} onPress={handleExit}>
                <Text style={localStyles.secondaryButtonText}>Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.primaryButton} onPress={resetGame}>
                <Trophy size={18} color="#FFFFFF" />
                <Text style={localStyles.primaryButtonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
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
  resultGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  resultHeader: { alignItems: 'center', marginBottom: 24, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20 },
  resultHeaderWin: { backgroundColor: '#ECFDF5' },
  resultHeaderLose: { backgroundColor: '#FEF2F2' },
  
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 16 },
  resultSubtitle: { fontSize: 14, color: '#4B5563', marginTop: 8, textAlign: 'center' },
  resultBody: { alignItems: 'center', gap: 24 },
  scoreSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 16, flex: 1, gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondaryButton: { backgroundColor: '#E5E7EB', paddingVertical: 12, borderRadius: 16, flex: 1, alignItems: 'center' },
  secondaryButtonText: { color: '#111827', fontWeight: '700', fontSize: 16 },
  resultButtons: { flexDirection: 'row', gap: 16, width: '100%' },
});
