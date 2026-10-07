// Android home-screen widget: the user's card QR + name. Tapping opens the app on the card.
'use no memo'; // widget trees are serialised to native views, not rendered by React
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { qrSvg } from '@/lib/qrSvg';

export interface WidgetCard {
  name: string;
  title: string;
  url: string;
  color: string;
}

export function CardQrWidget({ card, wide }: { card: WidgetCard | null; wide: boolean }) {
  if (!card) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2557E6', borderRadius: 24, padding: 12 }}>
        <TextWidget text="Digital Card" style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }} />
        <TextWidget text="Апп-аа нээж картаа нийтэлнэ үү" style={{ fontSize: 12, color: '#FFFFFFCC', marginTop: 4, textAlign: 'center' }} />
      </FlexWidget>
    );
  }
  const qr = (
    <FlexWidget style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 6 }}>
      <SvgWidget svg={qrSvg(card.url)} style={{ height: wide ? 120 : 112, width: wide ? 120 : 112 }} />
    </FlexWidget>
  );
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'digitalcard://' }}
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: card.color as `#${string}`, borderRadius: 24, padding: 12 }}
    >
      {qr}
      <FlexWidget style={{ marginLeft: wide ? 14 : 0, marginTop: wide ? 0 : 6, flex: wide ? 1 : 0, alignItems: wide ? 'flex-start' : 'center' }}>
        <TextWidget text={card.name} maxLines={wide ? 2 : 1} truncate="END" style={{ fontSize: wide ? 18 : 13, color: '#FFFFFF', fontWeight: '700' }} />
        {wide && card.title ? <TextWidget text={card.title} maxLines={2} truncate="END" style={{ fontSize: 13, color: '#FFFFFFCC', marginTop: 2 }} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}
