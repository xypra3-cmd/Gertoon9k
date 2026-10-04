// Convenience aliases over the generated Supabase types (database.types.ts).
import type { Database } from './database.types';

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];

export type Plan = Tables<'plans'>;
export type Profile = Tables<'profiles'>;
export type Card = Tables<'cards'>;
export type CardLink = Tables<'card_links'>;
export type Contact = Tables<'contacts'>;
export type CardEvent = Tables<'card_events'>;
export type Subscription = Tables<'subscriptions'>;
export type Payment = Tables<'payments'>;
export type Organization = Tables<'organizations'>;
export type OrgMember = Tables<'org_members'>;
export type PublicCard = Views<'public_cards'>;
export type CardDailyStats = Views<'card_daily_stats'>;

export type PlanId = 'free' | 'pro' | 'team';
export type CardEventType = 'view' | 'qr_open' | 'link_click' | 'contact_save' | 'exchange';
export type ContactSource = 'exchange' | 'qr' | 'manual';
export type ContactStatus = 'new' | 'follow_up' | 'customer' | 'partner' | 'closed';
export type MetWhereType = 'event' | 'office' | 'online' | 'other';
export type LinkKind =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'telegram'
  | 'whatsapp'
  | 'viber'
  | 'tiktok'
  | 'youtube'
  | 'website'
  | 'custom';

/** Data every card template renders from (web templates, print, vCard). */
export interface CardData {
  slug: string;
  templateId: string;
  colorScheme: 'a' | 'b';
  firstName: string;
  lastName: string | null;
  nameFormat: 'initial' | 'full';
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  bio: string | null;
  slogan: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  links: { kind: LinkKind; label: string | null; url: string }[];
}

export type { Database, Json } from './database.types';
