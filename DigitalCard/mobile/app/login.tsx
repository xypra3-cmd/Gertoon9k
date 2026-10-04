import { useState } from 'react';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { Button, Field, Notice, Screen, Txt } from '@/components/ui';

export default function Login() {
  const { t } = useI18n();
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

  return (
    <Screen>
      <Txt size={28} weight="700">Digital Card</Txt>
      <Txt muted>{t('app.tagline')}</Txt>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder={t('m.emailPlaceholder')} />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('auth.login')} onPress={submit} loading={busy} disabled={!email || !password} />
      <Link href="/register" asChild>
        <Button title={t('auth.register')} variant="secondary" onPress={() => undefined} />
      </Link>
      <Link href="/forgot" asChild>
        <Button title={t('auth.forgot')} variant="ghost" onPress={() => undefined} />
      </Link>
    </Screen>
  );
}
