import 'text-encoding';
import "@walletconnect/react-native-compat";
import { AppKit, AppKitProvider, bitcoin, createAppKit, solana } from "@reown/appkit-react-native";
import { WagmiAdapter } from "@reown/appkit-wagmi-react-native";
import { SolanaAdapter, PhantomConnector, SolflareConnector } from "@reown/appkit-solana-react-native";
import { BitcoinAdapter } from "@reown/appkit-bitcoin-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { arbitrum, celo, celoSepolia, mainnet, polygon } from "@wagmi/core/chains";
import { WagmiProvider } from "wagmi";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { storage } from "@/utils/StorageUtil";
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { auth, db } from '@/utils/FirebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const clipboardClient = {
  setString: async (value: string) => {
    Clipboard.setStringAsync(value);
  },
};

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://dashboard.reown.com
const projectId = "450b967f38d97ffc1b3078afbaf9eb91"; // This project ID will only work for Expo Go. Use your own project ID for production.

// 2. Create config
const metadata = {
  name: "EarnArena",
  description: "EarnArena - Play games, win crypto!",
  url: "https://earnarena.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "earnarena://",
    universal: "earnarena.com",
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    KHTeka: require('../assets/fonts/KHTeka-Regular.otf'),
    KHTekaMedium: require('../assets/fonts/KHTeka-Medium.otf'),
    KHTekaMono: require('../assets/fonts/KHTekaMono-Regular.otf'),
  });
  
  const [ready, setReady] = useState(false);
  const [appkitInstance, setAppkitInstance] = useState<any | null>(null);
  const [wagmiAdapterInstance, setWagmiAdapterInstance] = useState<any | null>(null);
  const [selectedChain, setSelectedChain] = useState<any | null>(null);
  const fallbackNetwork = __DEV__ ? 'testnet' : 'mainnet';
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [preferredNetwork, setPreferredNetwork] = useState<string>(fallbackNetwork);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) {
      setPreferredNetwork(fallbackNetwork);
      return;
    }
    const ref = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const preferred = snapshot.exists() ? (snapshot.data()?.preferredNetwork as string | undefined) : undefined;
      if (preferred === 'mainnet' || preferred === 'testnet') {
        setPreferredNetwork(preferred);
      } else {
        setPreferredNetwork(fallbackNetwork);
      }
    }, () => {
      setPreferredNetwork(fallbackNetwork);
    });
    return unsubscribe;
  }, [userId, fallbackNetwork]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setReady(false);
        const envNetwork = process.env.APP_NETWORK;
        const network = preferredNetwork ?? envNetwork ?? fallbackNetwork;
        const selected = network === 'mainnet' ? celo : celoSepolia;

        // Only include Celo (selected) in networks — app focuses on Celo only
        const networks = [selected];

        const wagmiAdpt = new WagmiAdapter({ projectId, networks: networks as any });

        const kit = createAppKit({
          projectId,
          // only the selected Celo network
          networks: [...networks],
          adapters: [wagmiAdpt],
          extraConnectors: [new PhantomConnector(), new SolflareConnector()],
          metadata,
          clipboardClient,
          storage,
          defaultNetwork: selected,
          enableAnalytics: true,
        });

        if (!mounted) return;
        setWagmiAdapterInstance(wagmiAdpt);
        setAppkitInstance(kit);
        setSelectedChain(selected);
      } catch (e) {
        // fallback: create with defaults
        try {
          const fallbackSelected = __DEV__ ? celoSepolia : celo;
          const networks = [fallbackSelected];
          const wagmiAdpt = new WagmiAdapter({ projectId, networks: networks as any });
          const solanaAdapter = new SolanaAdapter();
          const bitcoinAdapter = new BitcoinAdapter();
          const kit = createAppKit({
            projectId,
            networks: [...networks, solana, bitcoin],
            adapters: [wagmiAdpt, solanaAdapter, bitcoinAdapter],
            extraConnectors: [new PhantomConnector(), new SolflareConnector()],
            metadata,
            clipboardClient,
            storage,
            defaultNetwork: fallbackSelected,
            enableAnalytics: true,
          });
          if (!mounted) return;
          setWagmiAdapterInstance(wagmiAdpt);
          setAppkitInstance(kit);
          setSelectedChain(fallbackSelected);
        } catch (err) {
          console.warn('Failed to initialize AppKit', err);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [preferredNetwork, fallbackNetwork]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (!ready || !appkitInstance || !wagmiAdapterInstance || !selectedChain) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <WagmiProvider config={wagmiAdapterInstance.wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <AppKitProvider instance={appkitInstance}>
              {(() => {
                const AutoNetworkManager = require('../components/AutoNetworkManager').default;
                const ConnectionWatcher = require('../components/ConnectionWatcher').default;
                const WalletOnboardRedirect = require('../components/WalletOnboardRedirect').default;
                return (
                  <>
                    <AutoNetworkManager chain={selectedChain} />
                    <ConnectionWatcher />
                    <WalletOnboardRedirect />
                  </>
                )  
              })()}
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/create-account" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found"  options={{ headerShown: false }} />
                <Stack.Screen name="games/puzzle-game" options={{ headerShown: false }} />
                <Stack.Screen name="games/quiz-game" options={{ headerShown: false }} />
                <Stack.Screen name="games/card-match" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
              {/* This is a workaround for the Android modal issue. https://github.com/expo/expo/issues/32991#issuecomment-2489620459 */}
              <View style={{ position: "absolute", height: "100%", width: "100%" }}>
                <AppKit />
              </View>
            </AppKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
