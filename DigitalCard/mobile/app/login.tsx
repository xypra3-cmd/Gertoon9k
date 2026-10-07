import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { useTheme } from '@/lib/theme';
import { AuthField, AuthLayout } from '@/components/AuthLayout';
import { Button, Notice, Txt } from '@/components/ui';
import { Icon } from '@/components/motion';
import { passkeyAvailable, passkeyCancelled, signInWithPasskey } from '@/lib/passkey';

export default function Login() {
  const { t } = useI18n();
  const th = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (e) setError(errorText(t, e));
  };

  const passkey = async () => {
    setError(null);
    try {
      await signInWithPasskey();
    } catch (e) {
      if (!passkeyCancelled(e)) setError(errorText(t, e));
    }
  };

  return (
    <AuthLayout
      title={t('m.authHello')}
      subtitle={t('app.tagline')}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Txt muted size={15}>
            {t('m.noAccount')}
          </Txt>
          <Link href="/register" accessibilityRole="link">
            <Txt size={15} weight="700" style={{ color: th.primary }}>
              {t('auth.register')}
            </Txt>
          </Link>
        </View>
      }
    >
      <AuthField
        icon="mail"
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder={t('m.emailPlaceholder')}
        returnKeyType="next"
      />
      <AuthField
        icon="lock"
        secure
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => email && password && void submit()}
      />
      <Link href="/forgot" accessibilityRole="link" style={{ alignSelf: 'flex-end' }}>
        <Txt size={14} weight="600" style={{ color: th.primary }}>
          {t('auth.forgot')}
        </Txt>
      </Link>
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('auth.login')} onPress={submit} loading={busy} disabled={!email || !password} />
      {passkeyAvailable() ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ flex: 1, height: 1, backgroundColor: th.border }} />
            <Txt muted size={13}>
              {t('m.or')}
            </Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: th.border }} />
          </View>
          <Button title={t('m.passkeySignIn')} variant="secondary" icon={<Icon name="fingerprint" size={18} color={th.primary} />} onPress={() => void passkey()} />
        </>
      ) : null}
    </AuthLayout>
  );
}
