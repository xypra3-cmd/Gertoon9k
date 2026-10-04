import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@digitalcard/shared/types';
import { supabase } from './supabase';

export interface Entitlements {
  has_active_plan: boolean;
  personal_plan_id: 'free' | 'pro' | 'team';
  card_quota: number;
  crm_enabled: boolean;
  contact_limit: number | null;
  contact_count: number;
  editable_card_ids: string[];
  orgs: { org_id: string; role: string; status: string; name: string; active: boolean; allow_employee_edit_fields: string[] }[];
}

interface Ctx {
  session: Session | null;
  ready: boolean;
  profile: Profile | null;
  entitlements: Entitlements | null;
  refresh: () => void;
}
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const uid = session?.user.id;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const profile = useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from('profiles').select('*').eq('id', uid!).single()).data,
  });
  const ent = useQuery({
    queryKey: ['entitlements', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_entitlements');
      if (error) throw error;
      return data as unknown as Entitlements;
    },
  });

  const value = useMemo<Ctx>(
    () => ({
      session,
      ready,
      profile: profile.data ?? null,
      entitlements: ent.data ?? null,
      refresh: () => {
        void qc.invalidateQueries({ queryKey: ['entitlements'] });
        void qc.invalidateQueries({ queryKey: ['profile'] });
      },
    }),
    [session, ready, profile.data, ent.data, qc],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
