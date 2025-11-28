import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from 'wagmi';

import { storage } from '@/utils/StorageUtil';
import { USER_PROFILE_KEY } from '@/constants/storageKeys';
import { auth } from '@/utils/FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';


interface SignupForm {
  username: string;
  email: string;
  password: string;
}

const initialForm: SignupForm = { username: '', email: '', password: '' };

export default function CreateAccountScreen() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  const updateField = useCallback((key: keyof SignupForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const isDisabled = useMemo(() => {
    return !form.username.trim() || !form.email.trim() || !form.password.trim() || isSubmitting;
  }, [form.email, form.password, form.username, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const sanitizedUsername = form.username.trim();
    const sanitizedEmail = form.email.trim().toLowerCase();
    const sanitizedPassword = form.password.trim();

    if (!sanitizedUsername || !sanitizedEmail || !sanitizedPassword) {
      Alert.alert('Create account', 'Fill out every field before continuing.');
      return;
    }

    const emailPattern = /.+@.+\..+/;
    if (!emailPattern.test(sanitizedEmail)) {
      Alert.alert('Create account', 'Enter a valid email address.');
      return;
    }

    if (sanitizedPassword.length < 6) {
      Alert.alert('Create account', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await storage.setItem(USER_PROFILE_KEY, {
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      const user = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

      Alert.alert('Account created', 'Your profile is ready. Please sign in to continue.', [
        {
          text: 'Go to sign in',
          onPress: () => router.replace('/auth/login'),
        },
      ]);
      setForm(initialForm);
    } catch (error) {
      Alert.alert('Create account', 'We could not save your profile. Try again.');
      console.warn('CreateAccountScreen failed to persist profile', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [form.email, form.password, form.username, isSubmitting, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subtitle}>
            Choose a username and save your email so we can keep your tournaments in sync.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="earn_arena_gm"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={form.username}
              onChangeText={text => updateField('username', text)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={text => updateField('email', text)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="********"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry
              value={form.password}
              onChangeText={text => updateField('password', text)}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.cta, isDisabled && styles.ctaDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
          >
            <Text style={styles.ctaText}>{isSubmitting ? 'Saving...' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchLink} onPress={() => router.push('/auth/login')}>
            <Text style={styles.switchText}>
              Already registered? <Text style={styles.switchTextEmphasis}>Sign in</Text>
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
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
    color: '#64748B',
  },
  switchTextEmphasis: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
