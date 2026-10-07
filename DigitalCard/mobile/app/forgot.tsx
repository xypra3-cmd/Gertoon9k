import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { env } from '@/lib/env';
import { AuthField, AuthLayout } from '@/components/AuthLayout';
import { Button, Notice } from '@/components/ui';

export default function Forgot() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${env.webUrl}/reset-password` });
    setBusy(false);
    setMsg(error ? { tone: 'error', text: errorText(t, error) } : { tone: 'success', text: t('m.resetSent') });
  };
  return (
    <AuthLayout back title={t('auth.forgot')} subtitle={t('m.forgotSub')}>
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
      />
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('m.sendLink')} onPress={submit} loading={busy} disabled={!email.includes('@')} />
    </AuthLayout>
  );
}
