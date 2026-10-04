import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { env } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { Button, Field, Notice, Screen, Txt } from '@/components/ui';

export default function Register() {
  const { t, locale } = useI18n();
  const th = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accept, setAccept] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) return setMsg({ tone: 'error', text: t('m.passwordMin') });
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), locale } } });
    setBusy(false);
    if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
    if (!data.session) setMsg({ tone: 'success', text: t('m.checkEmail') });
  };

  return (
    <Screen>
      <Field label={t('card.firstName')} value={name} onChangeText={setName} autoComplete="name" />
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint={t('m.passwordMin')} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accept }} onPress={() => setAccept((a) => !a)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: th.primary, backgroundColor: accept ? th.primary : 'transparent' }} />
        <Txt style={{ flex: 1 }}>{t('auth.acceptTerms')}</Txt>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${env.webUrl}/legal/terms`)}>
          <Txt size={14} style={{ color: th.primary, textDecorationLine: 'underline' }}>{t('m.terms')}</Txt>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${env.webUrl}/legal/privacy`)}>
          <Txt size={14} style={{ color: th.primary, textDecorationLine: 'underline' }}>{t('m.privacy')}</Txt>
        </Pressable>
      </View>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('auth.register')} onPress={submit} loading={busy} disabled={!accept || !email || !name || !password} />
    </Screen>
  );
}
