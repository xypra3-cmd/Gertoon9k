import { useState } from 'react';
import { isStrongPassword } from '@digitalcard/shared/validation';
import { Linking, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { env } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { AuthField, AuthLayout, StrengthMeter } from '@/components/AuthLayout';
import { Icon } from '@/components/motion';
import { Button, Notice, Txt } from '@/components/ui';

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
    if (!isStrongPassword(password)) return setMsg({ tone: 'error', text: t('m.passwordMin') });
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), locale } } });
    setBusy(false);
    if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
    if (!data.session) setMsg({ tone: 'success', text: t('m.checkEmail') });
  };

  const legal = (path: string, label: string) => (
    <Pressable accessibilityRole="link" hitSlop={6} onPress={() => void Linking.openURL(`${env.webUrl}/legal/${path}`)}>
      <Txt size={14} weight="600" style={{ color: th.primary }}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <AuthLayout
      back
      title={t('m.registerTitle')}
      subtitle={t('m.registerSub')}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Txt muted size={15}>
            {t('m.haveAccount')}
          </Txt>
          <Link href="/login" replace accessibilityRole="link">
            <Txt size={15} weight="700" style={{ color: th.primary }}>
              {t('auth.login')}
            </Txt>
          </Link>
        </View>
      }
    >
      <AuthField icon="users" label={t('m.fullName')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder={t('m.fullNamePlaceholder')} />
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
      <AuthField
        icon="lock"
        secure
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        hint={<StrengthMeter password={password} />}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accept }}
        accessibilityLabel={t('auth.acceptTerms')}
        onPress={() => setAccept((a) => !a)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44, paddingTop: 2 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: th.primary,
            backgroundColor: accept ? th.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {accept ? <Icon name="check" size={16} color={th.onPrimary} strokeWidth={3} /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt size={15}>{t('auth.acceptTerms')}</Txt>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {legal('terms', t('m.terms'))}
            {legal('privacy', t('m.privacy'))}
          </View>
        </View>
      </Pressable>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('auth.register')} onPress={submit} loading={busy} disabled={!accept || !email || !name || !password} />
    </AuthLayout>
  );
}
