import { useEffect, useState } from 'react';
import { Alert, Linking, Switch, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { env } from '@/lib/env';
import { errorText } from '@/lib/errors';
import { useTheme } from '@/lib/theme';
import { Button, Card, Notice, Screen, Txt } from '@/components/ui';
import { setDailyReminder } from '@/lib/reminders';

export default function Settings() {
  const { t, locale, setLocale } = useI18n();
  const th = useTheme();
  const { session, profile, refresh } = useAuth();
  const [showNameLocal, setShowName] = useState<boolean | null>(null);
  const showName = showNameLocal ?? !!profile?.show_name_to_owners;
  const [reminders, setReminders] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem('dc-reminders').then((v) => setReminders(v === '1'));
  }, []);

  const changeLocale = async (l: 'mn' | 'en') => {
    setLocale(l);
    if (session) await supabase.from('profiles').update({ locale: l }).eq('id', session.user.id);
  };

  const toggleShowName = async (v: boolean) => {
    setShowName(v);
    const { error } = await supabase.from('profiles').update({ show_name_to_owners: v }).eq('id', session!.user.id);
    if (error) {
      setShowName(!v);
      setMsg({ tone: 'error', text: errorText(t, error) });
    } else refresh();
  };

  const toggleReminders = async (v: boolean) => {
    const res = await setDailyReminder(v, t('m.notifDaily'), t('m.notifBody'));
    const ok = res === 'ok';
    if (res === 'unsupported') setMsg({ tone: 'error', text: t('m.remindersDevBuild') });
    setReminders(v && ok);
    await AsyncStorage.setItem('dc-reminders', v && ok ? '1' : '0');
  };

  // Store requirement (App Store 5.1.1(v), Google Play): in-app account deletion.
  const deleteAccount = () =>
    Alert.alert(t('auth.deleteAccount'), t('m.deleteConfirm'), [
      { text: t('m.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_my_account');
          if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
          await supabase.auth.signOut();
          Alert.alert(t('m.deleted'));
        },
      },
    ]);

  const row = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 }}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: th.primary }} />
    </View>
  );

  return (
    <Screen>
      <Card>
        <Txt muted size={13}>
          {session?.user.email}
        </Txt>
        <Txt weight="600">{t('common.language')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Монгол" variant={locale === 'mn' ? 'primary' : 'secondary'} onPress={() => void changeLocale('mn')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="English" variant={locale === 'en' ? 'primary' : 'secondary'} onPress={() => void changeLocale('en')} />
          </View>
        </View>
      </Card>
      <Card>
        {row(t('m.showName'), showName, (v) => void toggleShowName(v))}
        {row(t('m.reminders'), reminders, (v) => void toggleReminders(v))}
      </Card>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('auth.logout')} variant="secondary" onPress={() => void supabase.auth.signOut()} />
      <Card>
        <Button title={t('auth.deleteAccount')} variant="danger" onPress={deleteAccount} />
        <Button title={t('m.deleteWeb')} variant="ghost" onPress={() => void Linking.openURL(`${env.webUrl}/legal/delete-account`)} />
      </Card>
    </Screen>
  );
}
