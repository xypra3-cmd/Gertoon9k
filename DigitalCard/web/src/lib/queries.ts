// TanStack Query hooks over Supabase. RLS decides what each user can see.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, CardLink, Contact, TablesInsert, TablesUpdate } from '@digitalcard/shared';
import { supabase } from './supabase';
import { useAuth } from './auth';

export function useMyCards() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['cards', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: ['card', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select(
          '*, card_links(*), organizations(brand_color, logo_path, allow_employee_edit_fields, locked_template_id)',
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Card & {
        card_links: CardLink[];
        organizations: {
          brand_color: string | null;
          logo_path: string | null;
          allow_employee_edit_fields: string[];
          locked_template_id: string | null;
        } | null;
      };
    },
  });
}

export function useContacts() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['contacts', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}

export function useUpdateContact() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'contacts'> }) => {
      const { data, error } = await supabase.from('contacts').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => inv('contacts', 'entitlements'),
  });
}

export function useCreateContact() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (row: TablesInsert<'contacts'>) => {
      const { data, error } = await supabase.from('contacts').insert(row).select().single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => inv('contacts', 'entitlements'),
  });
}

export function useDeleteContact() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => inv('contacts', 'entitlements'),
  });
}

export interface CardStatsRow {
  card_id: string;
  total_opens: number;
  views: number;
  qr_opens: number;
  unique_visitors: number;
  link_clicks: number;
  contact_saves: number;
  exchanges: number;
  followups: number;
  top_link_kind: string | null;
  top_link_clicks: number;
}

export function useCardStats(cardIds: string[], from: string | null) {
  return useQuery({
    queryKey: ['stats', cardIds.join(','), from],
    enabled: cardIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_card_stats', { p_card_ids: cardIds, p_from: from ?? undefined });
      if (error) throw error;
      return (data ?? []) as unknown as CardStatsRow[];
    },
  });
}
