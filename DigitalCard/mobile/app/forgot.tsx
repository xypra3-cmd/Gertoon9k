import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { env } from '@/lib/env';
import { Button, Field, Notice, Screen } from '@/components/ui';

export default function Forgot() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const submit = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${env.webUrl}/reset-password` });
    setMsg(error ? { tone: 'error', text: errorText(t, error) } : { tone: 'success', text: t('m.resetSent') });
  };
  return (
    <Screen>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('auth.forgot')} onPress={submit} disabled={!email.includes('@')} />
    </Screen>
  );
}
