import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { Loading } from '@/components/ui';
import { useTheme } from '@/lib/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function Gate() {
  const { session, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useI18n();
  const th = useTheme();
  const publicRoutes = ['login', 'register', 'forgot', 'c'];

  useEffect(() => {
    if (!ready) return;
    const isPublic = publicRoutes.includes(segments[0] ?? '');
    if (!session && !isPublic) router.replace('/login');
    if (session && (segments[0] === 'login' || segments[0] === 'register')) router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, ready, segments]);

  if (!ready) return <Loading />;
  return (
    <Stack screenOptions={{ headerTintColor: th.primary, headerStyle: { backgroundColor: th.card }, headerTitleStyle: { color: th.text }, contentStyle: { backgroundColor: th.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: t('auth.login') }} />
      <Stack.Screen name="register" options={{ title: t('auth.register') }} />
      <Stack.Screen name="forgot" options={{ title: t('auth.forgot') }} />
      <Stack.Screen name="contact/[id]" options={{ title: t('contacts.title') }} />
      <Stack.Screen name="c/[slug]" options={{ title: 'Digital Card' }} />
      <Stack.Screen name="edit/[id]" options={{ title: t('m.editCard') }} />
      <Stack.Screen name="welcome" options={{ title: t('welcome.title') }} />
      <Stack.Screen name="nearby" options={{ title: t('nearby.title') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <Gate />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
