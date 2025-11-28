import React, { useEffect, useRef } from 'react';
import { DevSettings, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSnapshot } from 'valtio';
import { ConnectionsController } from '@reown/appkit-core-react-native';

export default function ConnectionWatcher() {
  const router = useRouter();
  const snap = useSnapshot(ConnectionsController.state);
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    const isConnected = !!snap.isConnected;
    const prev = prevRef.current;
    // initialize prev
    if (prev === null) {
      prevRef.current = isConnected;
      return;
    }

    // detect transition from connected -> disconnected
    if (prev === true && isConnected === false) {
      try {
        // In dev, a full reload is fine for a clean state
        if (__DEV__) {
          // DevSettings.reload is available on React Native environment
          try {
            DevSettings.reload();
            return;
          } catch (e) {
            // fallback to router navigation
            console.warn('DevSettings.reload failed, falling back to router replace', e);
          }
        }

        // In production, navigate to landing page and reset navigation state
        router.replace('/');
      } catch (err) {
        console.warn('Failed to handle disconnect:', err);
      }
    }

    prevRef.current = isConnected;
  }, [snap.isConnected, router]);

  return null;
}
