import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { usePathname, useRouter } from 'expo-router';

import { storage } from '@/utils/StorageUtil';
import { USER_PROFILE_KEY } from '@/constants/storageKeys';

const AUTH_PREFIX = '/auth';
const CREATE_ACCOUNT_ROUTE = '/auth/create-account';
const LOGIN_ROUTE = '/auth/login';

export default function WalletOnboardRedirect() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      hasNavigatedRef.current = false;
      return;
    }

    if (hasNavigatedRef.current) {
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const storedProfile = await storage.getItem<{ email?: string }>(USER_PROFILE_KEY);
        const targetRoute = storedProfile?.email ? LOGIN_ROUTE : CREATE_ACCOUNT_ROUTE;

        if (!isMounted) {
          return;
        }

        if (pathname?.startsWith(AUTH_PREFIX) && pathname === targetRoute) {
          hasNavigatedRef.current = true;
          return;
        }

        router.push(targetRoute);
        hasNavigatedRef.current = true;
      } catch (error) {
        console.warn('WalletOnboardRedirect failed to resolve target route', error);
        if (!isMounted) {
          return;
        }
        router.push(CREATE_ACCOUNT_ROUTE);
        hasNavigatedRef.current = true;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isConnected, pathname, router]);

  return null;
}
