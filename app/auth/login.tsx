import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from 'wagmi';
// import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import { storage } from '@/utils/StorageUtil';
import { USER_PROFILE_KEY } from '@/constants/storageKeys';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/utils/FirebaseConfig';


type LoginForm = {
  email: string;
  password: string;
};

const initialForm: LoginForm = { email: '', password: '' };

export default function LoginScreen() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  const updateField = useCallback((key: keyof LoginForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (!form.email || !form.password) {
      Alert.alert('Sign in', 'Enter both your email and password to continue.');
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!normalizedEmail || !password) {
      Alert.alert('Sign in', 'Enter both your email and password to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (auth) {
        try {
        //   const credentials = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        //   if (credentials.user) {
            router.replace('/(tabs)');
            // return;
        //   }
        } catch (firebaseError) {
          console.warn('Firebase sign-in failed, falling back to local profile', firebaseError);
        }
      }

      const profile = await storage.getItem<{ email?: string; password?: string }>(USER_PROFILE_KEY);

      if (!profile || !profile.email || !profile.password) {
        Alert.alert('Sign in', 'No account found. Please create one first.');
        return;
      }

      if (profile.email !== normalizedEmail) {
        Alert.alert('Sign in', 'We could not find that email.');
        return;
      }

      if (profile.password !== password) {
        Alert.alert('Sign in', 'Your password is incorrect.');
        return;
      }

      const user = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      if (user) {
        router.replace('/(tabs)');
        return;
      }
    } catch (error) {
      Alert.alert('Sign in', 'Something went wrong. Try again.');
      console.warn('LoginScreen handleSubmit error', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [auth, form.email, form.password, isSubmitting, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your tournaments, rewards, and leaderboard standings.
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={form.email}
              onChangeText={text => updateField('email', text)}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={form.password}
              onChangeText={text => updateField('password', text)}
              placeholder="********"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.cta, isSubmitting && styles.ctaDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.ctaText}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchLink} onPress={() => router.push('/auth/create-account')}>
            <Text style={styles.switchText}>
              Need an account? <Text style={styles.switchTextEmphasis}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#93C5FD',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchLink: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#6B7280',
  },
  switchTextEmphasis: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
