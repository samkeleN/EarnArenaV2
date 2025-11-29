import { Calendar, Camera, Coins, Edit3, Mail, Phone, User } from "lucide-react-native";
import React, { useState, useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import globalStyles from "../../styles/global.styles";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { useFocusEffect } from "@react-navigation/native";
import { GameHistoryEntry, getGameHistory, getUserStats, UserStats, formatHistoryDate } from "@/utils/GameHistory";
import { retryPendingReward } from "@/utils/RewardWorkflow";
import { useAccount, useWalletClient } from "wagmi";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "@/utils/FirebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

type ProfileForm = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  createdAt?: string;
  walletLinkedAt?: string;
  avatar?: string;
};

export default function ProfileScreen() {
  const styles = globalStyles;
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileForm>({
    fullName: "EarnArena Player",
    username: "",
    email: "player@example.com",
    phone: "+1 (555) 123-4567",
    createdAt: undefined,
    walletLinkedAt: undefined,
    avatar: undefined,
  });
  const [userStats, setUserStats] = useState<UserStats>({ totalGames: 0, wins: 0, losses: 0 });
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const awaitingPayments = useMemo(() => history.filter(entry => entry.status === "pending"), [history]);
  const completedHistory = useMemo(() => history.filter(entry => entry.status !== "pending"), [history]);

  const refreshHistory = useCallback(async () => {
    try {
      const updatedHistory = await getGameHistory();
      setHistory(updatedHistory);
    } catch (err) {
      console.warn("Failed to refresh payment history", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const loadProfile = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              return null;
            }
            try {
              const ref = doc(db, "users", currentUser.uid);
              const snap = await getDoc(ref);
              if (!snap.exists()) {
                return null;
              }
              return snap.data() as Partial<ProfileForm>;
            } catch (profileErr) {
              console.warn("Failed to fetch profile from Firestore", profileErr);
              return null;
            }
          };

          const [cloudProfile, stats, gameHistory] = await Promise.all([
            loadProfile(),
            getUserStats(),
            getGameHistory(),
          ]);

          if (!active) {
            return;
          }

          if (cloudProfile) {
            setProfileData(prev => ({
              fullName: cloudProfile.fullName?.trim().length ? cloudProfile.fullName.trim() : prev.fullName,
              username: cloudProfile.username?.trim().length ? cloudProfile.username.trim() : prev.username,
              email: cloudProfile.email?.trim().length ? cloudProfile.email.trim() : prev.email,
              phone: cloudProfile.phone?.trim().length ? cloudProfile.phone.trim() : prev.phone,
              createdAt: cloudProfile.createdAt ?? prev.createdAt,
              walletLinkedAt: cloudProfile.walletLinkedAt ?? prev.walletLinkedAt,
              avatar: cloudProfile.avatar ?? prev.avatar,
            }));
          }

          setUserStats(stats);
          setHistory(gameHistory);
        } catch (err) {
          console.warn("Failed to load profile information", err);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const handleSaveChanges = async () => {
    setIsEditing(false);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Profile", "You need to sign in before updating your profile details.");
      return;
    }
    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          fullName: profileData.fullName.trim(),
          username: profileData.username.trim(),
          email: profileData.email.trim().toLowerCase(),
          phone: profileData.phone.trim(),
          createdAt: profileData.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      Alert.alert("Profile updated", "Your details have been saved to the cloud.");
    } catch (err) {
      console.warn("Failed to persist profile information", err);
      Alert.alert("Profile", "We couldn't save your changes. Please try again.");
    }
  };

  const greetingName = profileData.username || profileData.fullName.split(" ")[0] || "Player";
  const avatarUri = profileData.avatar && profileData.avatar.length > 5 ? profileData.avatar : "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60";

  const memberSinceLabel = useMemo(() => {
    const sourceDate = profileData.walletLinkedAt ?? profileData.createdAt;
    if (!sourceDate) {
      return "Wallet linked date unknown";
    }
    const date = new Date(sourceDate);
    if (Number.isNaN(date.getTime())) {
      return "Wallet linked date unknown";
    }
    return `Wallet linked ${date.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }, [profileData.createdAt, profileData.walletLinkedAt]);

  const renderPaymentItem = (item: GameHistoryEntry) => {
    const amountStyle = item.outcome === "win" ? styles.paymentItemAmountPositive : styles.paymentItemAmountNegative;
    const shortHash = item.txHash && item.txHash.length > 10 ? `${item.txHash.slice(0, 6)}...${item.txHash.slice(-4)}` : item.txHash;

    return (
      <View key={item.id} style={styles.paymentItem}>
        <View style={styles.paymentItemLeft}>
          <Text style={styles.paymentItemGame}>{item.gameName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <Calendar color="#95A5A6" size={14} />
            <Text style={styles.paymentItemDate}>{formatHistoryDate(item.playedAt)}</Text>
          </View>
          {item.status === "failed" && (
            <Text style={styles.paymentStatusFailed}>{item.statusMessage ?? "Reward failed"}</Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={amountStyle}>{item.amountDisplay}</Text>
          {shortHash && item.status === "completed" && (
            <Text style={styles.paymentTxHash}>{shortHash}</Text>
          )}
        </View>
      </View>
    );
  };

  const handleRetryReward = useCallback(async (item: GameHistoryEntry) => {
    if (!address) {
      Alert.alert("Wallet required", "Connect your wallet to resend the reward request.");
      return;
    }
    if (item.status !== "pending") {
      return;
    }

    setRetryingId(item.id);
    try {
      await retryPendingReward({ entry: item, playerWalletAddress: address, walletClient });
      Alert.alert("Reward request sent", "We resent the request to the master wallet. Please approve it from that wallet.");
    } catch (err) {
      Alert.alert("Reward Pending", err instanceof Error ? err.message : "Unable to resend reward right now.");
    } finally {
      setRetryingId(null);
      await refreshHistory();
    }
  }, [address, refreshHistory, walletClient]);

  const handlePickAvatar = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Profile", "You need to sign in before updating your avatar.");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need access to your photos to update the avatar.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) {
        return;
      }
      setUploadingAvatar(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const avatarRef = ref(storage, `avatars/${currentUser.uid}.jpg`);
      await uploadBytes(avatarRef, blob, { contentType: asset.mimeType ?? blob.type ?? 'image/jpeg' });
      const downloadUrl = await getDownloadURL(avatarRef);
      await setDoc(doc(db, "users", currentUser.uid), { avatar: downloadUrl, updatedAt: new Date().toISOString() }, { merge: true });
      setProfileData(prev => ({ ...prev, avatar: downloadUrl }));
      Alert.alert("Profile", "Avatar updated successfully.");
    } catch (err) {
      console.warn("Failed to update avatar", err);
      Alert.alert("Profile", "Unable to upload avatar right now. Please try again later.");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const renderAwaitingItem = (item: GameHistoryEntry, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.awaitingPaymentItem,
        index === awaitingPayments.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
      ]}
      onPress={() => handleRetryReward(item)}
      activeOpacity={0.85}
      disabled={retryingId === item.id}
    >
      <View style={styles.awaitingPaymentLeft}>
        <Text style={styles.paymentItemGame}>{item.gameName}</Text>
        <Text style={styles.awaitingPaymentStatus}>{item.statusMessage ?? "Awaiting confirmation"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.awaitingPaymentAmount}>{item.amountDisplay}</Text>
        <Text style={styles.awaitingPaymentTime}>{formatHistoryDate(item.playedAt)}</Text>
        <View style={styles.awaitingPaymentHintRow}>
          {retryingId === item.id ? (
            <>
              <ActivityIndicator size="small" color="#B45309" style={{ marginRight: 6 }} />
              <Text style={styles.awaitingPaymentSending}>Sending…</Text>
            </>
          ) : (
            <Text style={styles.awaitingPaymentHint}>Tap to resend</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.appContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={{ color: "#0F172A", fontSize: 20, fontWeight: "700" }}>My Profile</Text>
          <View style={styles.balanceBadge}>
            <Coins color="#FFD700" size={20} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.pagePadding, { paddingBottom: 10 }]} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={{ paddingHorizontal: 1, marginTop: 10 }}>
          <View style={styles.profileCard}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.profileAvatar}
                />
                <TouchableOpacity style={styles.avatarEditButton} onPress={handlePickAvatar} activeOpacity={0.85}>
                  <Camera color="#FFFFFF" size={16} />
                </TouchableOpacity>
                {uploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text style={styles.profileName}>Hey {greetingName}!</Text>
              <Text style={styles.profileSince}>{memberSinceLabel}</Text>
            </View>

            {/* Profile Stats */}
            <View style={styles.profileStatsContainer}>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNumber}>{userStats.totalGames}</Text>
                <Text style={styles.profileStatLabel}>Games Played</Text>
              </View>

              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNumber}>{userStats.wins}</Text>
                <Text style={styles.profileStatLabel}>Wins</Text>
              </View>

              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNumber}>{userStats.losses}</Text>
                <Text style={styles.profileStatLabel}>Losses</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile Edit Form */}
        <View style={{ paddingHorizontal: 1, marginTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
              My Details
            </Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={{ flexDirection: "row", alignItems: "center" }}>
              <Edit3
                color={isEditing ? "#2563EB" : "#95A5A6"}
                size={18}
                fill={isEditing ? "#2563EB" : "none"}
              />
              <Text style={{ marginLeft: 8, fontWeight: "700", color: isEditing ? "#2563EB" : "#6B7280" }}>
                {isEditing ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetailsCard}>
            <View style={styles.profileDetailRow}>
              <User color="#2563EB" size={18} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.profileDetailLabel}>Full Name</Text>
                {isEditing ? (
                  <TextInput
                    value={profileData.fullName}
                    onChangeText={(text) => setProfileData({ ...profileData, fullName: text })}
                    style={{ backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10, color: "#0F172A", marginTop: 6, minWidth: 220 }}
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{profileData.fullName}</Text>
                )}
              </View>
            </View>

            <View style={styles.profileDetailRow}>
              <User color="#2563EB" size={18} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.profileDetailLabel}>Username</Text>
                {isEditing ? (
                  <TextInput
                    value={profileData.username}
                    onChangeText={(text) => setProfileData({ ...profileData, username: text })}
                    autoCapitalize="none"
                    style={{ backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10, color: "#0F172A", marginTop: 6, minWidth: 220 }}
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{profileData.username || "--"}</Text>
                )}
              </View>
            </View>

            <View style={styles.profileDetailRow}>
              <Mail color="#2563EB" size={18} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.profileDetailLabel}>Email</Text>
                {isEditing ? (
                  <TextInput
                    value={profileData.email}
                    onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                    keyboardType="email-address"
                    style={{ backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10, color: "#0F172A", marginTop: 6, minWidth: 220 }}
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{profileData.email}</Text>
                )}
              </View>
            </View>

            <View style={styles.profileDetailRow}>
              <Phone color="#2563EB" size={18} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.profileDetailLabel}>Phone</Text>
                {isEditing ? (
                  <TextInput
                    value={profileData.phone}
                    onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                    keyboardType="phone-pad"
                    style={{ backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10, color: "#0F172A", marginTop: 6, minWidth: 220 }}
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{profileData.phone}</Text>
                )}
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity onPress={handleSaveChanges} style={{ backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 12, marginTop: 12, alignItems: "center" }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Payment History */}

        <View style={styles.paymentHistoryContainer}>
          
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" ,  marginBottom: 12 }}>Wallet Info
            
          </Text>
          
          <NetworkSwitcher />
          {awaitingPayments.length > 0 && (
            <View style={styles.awaitingPaymentContainer}>
              <Text style={styles.awaitingPaymentHeading}>Awaiting Rewards</Text>
              <Text style={styles.awaitingPaymentHelper}>Tap an item to resend the reward request.</Text>
              {awaitingPayments.map((entry, index) => renderAwaitingItem(entry, index))}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 , marginTop: awaitingPayments.length > 0 ? 24 : 12}}>
            
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>Payment History</Text>
          </View>

          <View>
            {completedHistory.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 8 }}>No completed payments yet.</Text>
            ) : (
              completedHistory.map(renderPaymentItem)
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}