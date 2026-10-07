import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { parseCardLink } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';
import { Icon } from '@/components/motion';
import { useTheme } from '@/lib/theme';
import { nfcAvailable, nfcCancelled, readCardTag } from '@/lib/nfc';

export default function Scan() {
  const { t } = useI18n();
  const router = useRouter();
  const th = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [external, setExternal] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const handled = useRef(false);
  const [nfc, setNfc] = useState(false);
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void nfcAvailable().then((ok) => alive && setNfc(ok));
    return () => {
      alive = false;
    };
  }, []);

  const readNfc = async () => {
    setNfcMsg(null);
    try {
      const slug = await readCardTag(t('m.nfcHold'));
      if (slug) router.push({ pathname: '/c/[slug]', params: { slug, src: 'qr' } });
      else setNfcMsg(t('m.nfcNotCard'));
    } catch (e) {
      if (!nfcCancelled(e)) setNfcMsg(t('m.nfcFailed'));
    }
  };

  // Re-arm the scanner every time the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    const slug = parseCardLink(data);
    if (slug) {
      router.push({ pathname: '/c/[slug]', params: { slug, src: 'qr' } });
    } else {
      setExternal(data);
    }
  };

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return (
      <Screen title={t('tabs.scan')}>
        <Notice text={t('m.cameraDenied')} />
        {permission.canAskAgain ? <Button title={t('m.grant')} onPress={() => void requestPermission()} /> : <Button title={t('m.openSettings')} onPress={() => void Linking.openSettings()} />}
      </Screen>
    );
  }

  if (external) {
    const isWeb = /^https?:\/\//i.test(external);
    return (
      <Screen title={t('tabs.scan')}>
        <Card>
          <Txt>{t('m.externalQr')}</Txt>
          <Txt muted selectable>
            {external}
          </Txt>
        </Card>
        {isWeb && <Button title={t('m.openInBrowser')} onPress={() => void Linking.openURL(external)} />}
        <Button
          title={t('m.scanAgain')}
          variant="secondary"
          onPress={() => {
            setExternal(null);
            handled.current = false;
          }}
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {active && <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />}
      <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            borderRadius: 24,
          }}
        />
        <Txt style={{ color: '#FFFFFF', marginTop: 16 }}>{t('m.scanHint')}</Txt>
      </View>
      <SafeAreaView edges={['top']} pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: 0 }}>
        <Txt size={28} weight="800" style={{ color: '#FFFFFF', paddingTop: 8 }}>
          {t('tabs.scan')}
        </Txt>
      </SafeAreaView>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 110, gap: 10 }}>
        {nfcMsg ? <Notice tone="error" text={nfcMsg} /> : null}
        {nfc ? <Button title={t('m.nfcRead')} variant="secondary" icon={<Icon name="nfc" color={th.primary} size={18} />} onPress={() => void readNfc()} /> : null}
        <Button
          title={t('ai.scanCard')}
          variant="ai"
          icon={<Icon name="camera" color={th.accent} size={18} />}
          onPress={() =>
            router.push({
              pathname: '/contact/[id]',
              params: { id: 'new', scan: '1' },
            })
          }
        />
      </View>
    </View>
  );
}
