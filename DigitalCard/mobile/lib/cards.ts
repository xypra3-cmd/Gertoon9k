import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardData, Contact, LinkKind, PublicCard } from '@digitalcard/shared/types';
import { supabase } from './supabase';
import { storageUrl } from './env';
import { useAuth } from './auth';

export function toCardData(c: PublicCard): CardData {
  const links = (Array.isArray(c.links) ? (c.links as { kind: string; label: string | null; url: string }[]) : []).map((l) => ({ ...l, kind: l.kind as LinkKind }));
  return {
    slug: c.slug ?? '',
    templateId: c.template_id ?? 'classic',
    colorScheme: (c.color_scheme as 'a' | 'b') ?? 'a',
    firstName: c.first_name ?? '',
    lastName: c.last_name,
    nameFormat: (c.name_format as 'initial' | 'full') ?? 'initial',
    title: c.title,
    company: c.company,
    phone: c.phone,
    email: c.email,
    website: c.website,
    address: c.address,
    bio: c.bio,
    slogan: c.slogan,
    avatarUrl: storageUrl('avatars', c.avatar_path),
    logoUrl: storageUrl('logos', c.logo_path) ?? storageUrl('logos', c.org_logo_path),
    brandColor: c.org_brand_color,
    links,
  };
}

export async function fetchPublicCard(slug: string) {
  const { data, error } = await supabase.from('public_cards').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export function useMyCards() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['cards', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('cards').select('*, card_links(*)').eq('owner_id', session!.user.id).is('deleted_at', null).order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

const CACHE_KEY = 'dc-contacts-cache';

/** Contacts with an offline fallback: the last successful list is cached on the device. */
export function useContacts() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['contacts', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<{ rows: Contact[]; offline: boolean }> => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error || !data) {
        const cached = await AsyncStorage.getItem(`${CACHE_KEY}:${session!.user.id}`);
        if (cached) return { rows: JSON.parse(cached) as Contact[], offline: true };
        throw error ?? new Error('offline');
      }
      void AsyncStorage.setItem(`${CACHE_KEY}:${session!.user.id}`, JSON.stringify(data));
      return { rows: data, offline: false };
    },
  });
}

/** UB (UTC+8) calendar day helpers — same boundaries as the database. */
export const ubToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
export function rangeStartIso(days: number | null): string | null {
  if (days === null) return null;
  const day = new Date(Date.now() + 8 * 3600e3 - (days - 1) * 864e5).toISOString().slice(0, 10);
  return new Date(Date.parse(`${day}T00:00:00Z`) - 8 * 3600e3).toISOString();
}
