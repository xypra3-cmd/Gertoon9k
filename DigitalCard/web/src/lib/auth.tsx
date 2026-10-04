import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@digitalcard/shared';
import { supabase } from './supabase';
import { useI18n } from '@/i18n/I18nProvider';

export interface OrgEntitlement {
  org_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'active';
  name: string;
  active: boolean;
  allow_employee_edit_fields: string[];
  locked_template_id: string | null;
}

export interface Entitlements {
  has_active_plan: boolean;
  plan_ids: string[];
  personal_plan_id: 'free' | 'pro' | 'team';
  personal_period_end: string | null;
  personal_expired: boolean;
  card_quota: number;
  personal_card_count: number;
  crm_enabled: boolean;
  contact_limit: number | null;
  contact_count: number;
  editable_card_ids: string[];
  orgs: OrgEntitlement[];
  is_admin: boolean;
}

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  entitlements: Entitlements | null;
  refresh: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const { locale, setLocale } = useI18n();
  const uid = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) qc.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const profileQ = useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid!).single();
      if (error) throw error;
      return data;
    },
  });

  const entQ = useQuery({
    queryKey: ['entitlements', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_entitlements');
      if (error) throw error;
      return data as unknown as Entitlements;
    },
  });

  // Apply the saved profile locale once after login.
  const profileLocale = profileQ.data?.locale;
  useEffect(() => {
    if (profileLocale === 'mn' || profileLocale === 'en') setLocale(profileLocale);
  }, [profileLocale, setLocale]);

  // Persist language changes to profiles.locale.
  useEffect(() => {
    if (uid && profileLocale && profileLocale !== locale) {
      void supabase
        .from('profiles')
        .update({ locale })
        .eq('id', uid)
        .then(() => qc.invalidateQueries({ queryKey: ['profile', uid] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading: loading || (!!uid && (profileQ.isLoading || entQ.isLoading)),
      profile: profileQ.data ?? null,
      entitlements: entQ.data ?? null,
      refresh: () => {
        void qc.invalidateQueries({ queryKey: ['entitlements'] });
        void qc.invalidateQueries({ queryKey: ['profile'] });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        qc.clear();
      },
    }),
    [session, loading, uid, profileQ.isLoading, profileQ.data, entQ.isLoading, entQ.data, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
