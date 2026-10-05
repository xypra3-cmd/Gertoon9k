// Same getting-started checklist as the web dashboard (data: get_my_growth RPC). No prices or upsell.
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Card, Txt } from './ui';
import { Appear, Icon, ProgressRing } from './motion';

interface Growth {
  has_card: boolean;
  has_photo: boolean;
  has_links: boolean;
  has_published: boolean;
  has_shared: boolean;
  has_contact: boolean;
}

export function GettingStarted() {
  const { t } = useI18n();
  const th = useTheme();
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ['growth', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_growth');
      if (error) throw error;
      return data as unknown as Growth;
    },
  });
  if (!q.data) return null;
  const g = q.data;
  const steps = [
    ['card', g.has_card],
    ['photo', g.has_photo],
    ['links', g.has_links],
    ['publish', g.has_published],
    ['share', g.has_shared],
    ['contact', g.has_contact],
  ] as const;
  const done = steps.filter(([, d]) => d).length;
  if (done === steps.length) return null;
  return (
    <Appear>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <ProgressRing value={done / steps.length} track={th.border} label={t('growth.progress', { done, total: steps.length })} />
            <View
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight="700">{`${done}/${steps.length}`}</Txt>
            </View>
          </View>
          <Txt size={17} weight="700">
            {t('growth.title')}
          </Txt>
        </View>
        {steps.map(([id, d], i) => (
          <Appear key={id} index={i + 1}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 36,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d ? th.success : 'transparent',
                  borderWidth: d ? 0 : 2,
                  borderColor: th.border,
                }}
              >
                {d ? <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              <Txt size={15} muted={d} style={d ? { textDecorationLine: 'line-through' } : undefined}>
                {t(`growth.steps.${id}`)}
              </Txt>
            </View>
          </Appear>
        ))}
      </Card>
    </Appear>
  );
}
