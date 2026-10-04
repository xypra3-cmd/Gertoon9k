import type { Card, CardData, CardLink, LinkKind, PublicCard } from '@digitalcard/shared/types';
import { storageUrl } from './env';

type LinkLike = { kind: string; label: string | null; url: string };

export function fromPublicCard(c: PublicCard): CardData {
  const links = (Array.isArray(c.links) ? (c.links as unknown as LinkLike[]) : []).map((l) => ({
    kind: l.kind as LinkKind,
    label: l.label,
    url: l.url,
  }));
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

export function fromCard(
  c: Pick<
    Card,
    | 'slug'
    | 'template_id'
    | 'color_scheme'
    | 'first_name'
    | 'last_name'
    | 'name_format'
    | 'title'
    | 'company'
    | 'phone'
    | 'email'
    | 'website'
    | 'address'
    | 'bio'
    | 'slogan'
    | 'avatar_path'
    | 'logo_path'
  >,
  links: Pick<CardLink, 'kind' | 'label' | 'url' | 'sort'>[] = [],
  org?: { brand_color: string | null; logo_path: string | null } | null,
): CardData {
  return {
    slug: c.slug,
    templateId: c.template_id,
    colorScheme: c.color_scheme as 'a' | 'b',
    firstName: c.first_name,
    lastName: c.last_name,
    nameFormat: c.name_format as 'initial' | 'full',
    title: c.title,
    company: c.company,
    phone: c.phone,
    email: c.email,
    website: c.website,
    address: c.address,
    bio: c.bio,
    slogan: c.slogan,
    avatarUrl: storageUrl('avatars', c.avatar_path),
    logoUrl: storageUrl('logos', c.logo_path) ?? storageUrl('logos', org?.logo_path),
    brandColor: org?.brand_color ?? null,
    links: [...links]
      .sort((a, b) => a.sort - b.sort)
      .map((l) => ({ kind: l.kind as LinkKind, label: l.label, url: l.url })),
  };
}
