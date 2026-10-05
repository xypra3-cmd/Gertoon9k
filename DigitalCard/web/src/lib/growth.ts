import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';

export interface Growth {
  referral_code: string;
  invited: number;
  rewarded: number;
  onboarded_at: string | null;
  has_card: boolean;
  has_published: boolean;
  has_photo: boolean;
  has_links: boolean;
  has_shared: boolean;
  has_contact: boolean;
}

export function useGrowth() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['growth', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_growth');
      if (error) throw error;
      return data as unknown as Growth;
    },
  });
}

const REF_KEY = 'dc.ref';
/** Remembers ?ref=CODE from any landing URL until sign-up. */
export function captureReferral(search: string) {
  const code = new URLSearchParams(search).get('ref');
  if (code && /^[a-z0-9]{6,12}$/i.test(code)) {
    try {
      localStorage.setItem(REF_KEY, code.toLowerCase());
    } catch {
      /* storage unavailable */
    }
  }
}
export function storedReferral(): string | null {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}
export const inviteUrl = (code: string) => `${window.location.origin}/register?ref=${code}`;
