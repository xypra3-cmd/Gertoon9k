import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { parseCardLink } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';

export default function Scan() {
  const { t } = useI18n();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [external, setExternal] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const handled = useRef(false);

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
      <Screen>
        <Notice text={t('m.cameraDenied')} />
        {permission.canAskAgain ? <Button title={t('m.grant')} onPress={() => void requestPermission()} /> : <Button title={t('m.openSettings')} onPress={() => void Linking.openSettings()} />}
      </Screen>
    );
  }

  if (external) {
    const isWeb = /^https?:\/\//i.test(external);
    return (
      <Screen>
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
        <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 24 }} />
        <Txt style={{ color: '#FFFFFF', marginTop: 16 }}>{t('m.scanHint')}</Txt>
      </View>
    </View>
  );
}
