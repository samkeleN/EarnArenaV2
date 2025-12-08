import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, RotateCcw, Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { recordGameResult } from '@/utils/GameHistory';
import { rewardPlayerForGameWin } from '@/utils/RewardWorkflow';
import { useAccount, useWalletClient } from 'wagmi';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = 3;
const TILE_COUNT = BOARD_SIZE * BOARD_SIZE;
const TILE_MARGIN = 4; // margin around each tile (will be applied on both sides)
const availableWidth = screenWidth - 64; // left/right padding in layout
const TILE_SIZE = Math.floor((availableWidth - (TILE_MARGIN * 2 * BOARD_SIZE)) / BOARD_SIZE);

// Puzzle tile type
type Tile = {
  id: number;
  originalPosition: number;
  currentPosition: number;
  isEmpty: boolean;
};

export default function PuzzleGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const recordedRef = useRef(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Puzzle image - using one of the contextual images
  const puzzleImage = 'https://images.unsplash.com/photo-1543033906-8f2a9f541af9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZXNwb3J0cyUyMHZpcnR1YWwlMjByYWNpbmclMjBldmVudHxlbnwwfHwwfHx8MA%3D%3D';

  // Initialize the puzzle board
  const gameTitle = useMemo(() => {
    const raw = typeof params?.title === 'string' ? params.title.trim() : '';
    return raw.length > 0 ? raw : 'Puzzle Game';
  }, [params?.title]);

  const rewardDisplay = useMemo(() => {
    const raw = typeof params?.reward === 'string' ? params.reward.trim() : '';
    return raw.length > 0 ? raw : '0.8 CELO';
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

  const recordOutcome = useCallback(async (outcome: 'win' | 'loss') => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    if (outcome === 'win') {
      try {
        await rewardWin();
      } catch (err) {
        console.warn('Failed to initiate reward payout', err);
        Alert.alert("Reward Pending", err instanceof Error ? err.message : "Unable to send reward right now.");
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
      console.warn('Failed to record puzzle outcome', err);
    }

  }, [address, gameTitle, paymentAmount, rewardWin, router, walletClient]);
  const initializeBoard = useCallback(() => {
    recordedRef.current = false;
    const initialTiles: Tile[] = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      initialTiles.push({ id: i, originalPosition: i, currentPosition: i, isEmpty: i === TILE_COUNT - 1 });
    }

    const tilesToShuffle = initialTiles.slice(0, -1);
    for (let i = tilesToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tilesToShuffle[i], tilesToShuffle[j]] = [tilesToShuffle[j], tilesToShuffle[i]];
    }

    tilesToShuffle.forEach((tile, index) => {
      tile.currentPosition = index;
    });

    const newTiles = [...tilesToShuffle, initialTiles[TILE_COUNT - 1]];
    setTiles(newTiles);
    setMoves(0);
    setTime(0);
    setIsPlaying(true);
    setGameCompleted(false);
  }, []);

  // Start timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && !gameCompleted) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, gameCompleted]);

  // Check if puzzle is solved
  useEffect(() => {
    if (tiles.length === 0) return;
    const isSolved = tiles.every(tile => tile.currentPosition === tile.originalPosition);
    if (isSolved && isPlaying) {
      setIsPlaying(false);
      setGameCompleted(true);
      void recordOutcome('win');
      Alert.alert('Congratulations!', `You solved the puzzle in ${moves} moves and ${time} seconds!`, [{ text: 'Play Again', onPress: initializeBoard }]);
    }
  }, [tiles, moves, time, isPlaying, initializeBoard, recordOutcome]);

  // Handle tile press: only move when tapped tile is adjacent to empty space
  const handleTilePress = (tile: Tile) => {
    if (gameCompleted) return;
    if (tile.isEmpty) return;

    const emptyTile = tiles.find(t => t.isEmpty)!;
    const tileRow = Math.floor(tile.currentPosition / BOARD_SIZE);
    const tileCol = tile.currentPosition % BOARD_SIZE;
    const emptyRow = Math.floor(emptyTile.currentPosition / BOARD_SIZE);
    const emptyCol = emptyTile.currentPosition % BOARD_SIZE;
    const isAdjacent = (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) || (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow);

    if (!isAdjacent) return;

    // swap positions immutably
    const newTiles = tiles.map(t => {
      if (t.id === tile.id) return { ...t, currentPosition: emptyTile.currentPosition };
      if (t.id === emptyTile.id) return { ...t, currentPosition: tile.currentPosition };
      return t;
    });

    setTiles(newTiles);
    setMoves(m => m + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  useEffect(() => { initializeBoard(); }, [initializeBoard]);

  // Prepare tiles in board order for rendering (position -> tile)
  const renderedTiles = useMemo<Tile[]>(() => {
    if (tiles.length === 0) return [] as Tile[];
    return [...tiles].sort((a, b) => a.currentPosition - b.currentPosition);
  }, [tiles]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            void recordOutcome('loss');
            router.back();
          }}
        >
          <ArrowLeft color="#2563EB" size={20} />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puzzle Game</Text>
        <TouchableOpacity style={styles.headerButton} onPress={initializeBoard}>
          <RotateCcw color="#2563EB" size={20} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <View style={styles.statRow}><Trophy color="#F1C40F" size={18} /><Text style={styles.statNumber}>{moves}</Text></View>
          <Text style={styles.statLabel}>MOVES</Text>
        </View>
        <View style={styles.statBlock}>
          <View style={styles.statRow}><Clock color="#2563EB" size={18} /><Text style={styles.statNumber}>{formatTime(time)}</Text></View>
          <Text style={styles.statLabel}>TIME</Text>
        </View>
      </View>

      {/* Board */}
      <View style={styles.boardWrapper}>
        <View style={[styles.board, { width: BOARD_SIZE * (TILE_SIZE + TILE_MARGIN * 2) + 20, height: BOARD_SIZE * (TILE_SIZE + TILE_MARGIN * 2) + 20 }]}>
          <View style={styles.boardInner}>
            {renderedTiles.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                onPress={() => handleTilePress(tile)}
                disabled={gameCompleted}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                style={[styles.tile, tile.isEmpty ? styles.tileEmpty : styles.tileFilled, { width: TILE_SIZE, height: TILE_SIZE, margin: TILE_MARGIN }]}
              >
                {!tile.isEmpty && (
                  <View style={styles.tileImageWrap}>
                    <Image
                      source={{ uri: puzzleImage }}
                      style={[StyleSheet.absoluteFill, { width: TILE_SIZE * BOARD_SIZE, height: TILE_SIZE * BOARD_SIZE, resizeMode: 'cover', left: -((tile.originalPosition % BOARD_SIZE) * TILE_SIZE), top: -(Math.floor(tile.originalPosition / BOARD_SIZE) * TILE_SIZE) } ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

          {/* Reference thumbnail (click to open pop image). Hidden while game is playing. */}
          {!isPlaying && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <TouchableOpacity style={styles.referenceButton} onPress={() => setShowReferenceModal(true)} activeOpacity={0.85}>
                <Text style={styles.referenceButtonText}>Show Reference</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Full-screen modal for reference image */}
          <Modal visible={showReferenceModal} animationType="fade" transparent onRequestClose={() => setShowReferenceModal(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContentLarge}>
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowReferenceModal(false)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <Image source={{ uri: puzzleImage }} style={styles.modalImage} resizeMode="contain" />
              </View>
            </View>
          </Modal>

          {gameCompleted && (
          <View style={styles.completedBox}>
            <Text style={styles.completedTitle}>Puzzle Completed!</Text>
            <Text style={styles.completedSub}>{moves} moves • {formatTime(time)}</Text>
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>Tap tiles adjacent to the empty space to move them</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF6FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', elevation: 2 },
  headerButton: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  headerButtonText: { marginLeft: 6, color: '#2563EB', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 8, borderRadius: 12, elevation: 1 },
  statBlock: { alignItems: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statNumber: { marginLeft: 6, fontWeight: '700', color: '#0F172A' },
  statLabel: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  boardWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  board: { backgroundColor: '#DBEAFE', borderRadius: 12, padding: 10 },
  boardInner: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { margin: 2, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tileEmpty: { backgroundColor: '#BFDBFE', opacity: 0.6 },
  tileFilled: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFE' },
  tileImageWrap: { width: '100%', height: '100%' },
  completedBox: { marginTop: 12, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 12, alignItems: 'center' },
  completedTitle: { color: '#065F46', fontWeight: '800', fontSize: 16 },
  completedSub: { color: '#065F46', marginTop: 6 },
  instructions: { padding: 12, backgroundColor: '#FFFFFF', margin: 12, borderRadius: 12 },
  instructionsText: { textAlign: 'center', color: '#374151', fontWeight: '600' },
  referenceLabel: { color: '#374151', fontWeight: '700', marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContentLarge: { width: '100%', maxWidth: 760, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  modalClose: { alignSelf: 'flex-end', padding: 8 },
  modalCloseText: { color: '#2563EB', fontWeight: '700' },
  modalImage: { width: '100%', height: 420, borderRadius: 8 },
  referenceButton: { backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  referenceButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
