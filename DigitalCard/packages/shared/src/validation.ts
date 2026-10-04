// zod schemas shared by web and mobile. The database enforces the same rules (CHECK constraints).
import { z } from 'zod';
import { TEMPLATE_IDS } from './templates';

/** Only https://, mailto:, tel: links are allowed (no javascript:, data:, http:). */
export const SAFE_URL_RE = /^(https:\/\/[^\s<>"']+|mailto:[^\s<>"']+|tel:\+?[0-9 ()-]{3,30})$/i;

export const safeUrl = z.string().trim().max(500).regex(SAFE_URL_RE, 'errors.invalidUrl');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'errors.tooLong')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{6,40}$/, 'errors.invalidSlug');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, 'errors.invalidPhone');

export const emailSchema = z.string().trim().toLowerCase().email('errors.invalidEmail').max(254);

export const LINK_KINDS = [
  'facebook',
  'instagram',
  'linkedin',
  'telegram',
  'whatsapp',
  'viber',
  'tiktok',
  'youtube',
  'website',
  'custom',
] as const;

export const linkSchema = z.object({
  kind: z.enum(LINK_KINDS),
  label: optionalText(60),
  url: safeUrl,
  sort: z.number().int().min(0).max(1000).default(0),
});
export type LinkInput = z.infer<typeof linkSchema>;

export const cardSchema = z.object({
  slug: slugSchema,
  template_id: z.enum(TEMPLATE_IDS),
  color_scheme: z.enum(['a', 'b']),
  first_name: z.string().trim().min(1, 'errors.required').max(60, 'errors.tooLong'),
  last_name: optionalText(60),
  name_format: z.enum(['initial', 'full']),
  title: optionalText(80),
  company: optionalText(80),
  phone: phoneSchema
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  email: emailSchema
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  website: z
    .string()
    .trim()
    .max(500)
    .regex(/^https:\/\/[^\s<>"']+$/i, 'errors.httpsOnly')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  address: optionalText(200),
  bio: optionalText(500),
  slogan: optionalText(120),
  is_published: z.boolean().default(false),
});
export type CardInput = z.infer<typeof cardSchema>;

export const CONTACT_STATUSES = ['new', 'follow_up', 'customer', 'partner', 'closed'] as const;
export const MET_WHERE_TYPES = ['event', 'office', 'online', 'other'] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'errors.required').max(120, 'errors.tooLong'),
  title: optionalText(80),
  company: optionalText(80),
  phone: phoneSchema
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  email: emailSchema
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  website: optionalText(500),
  // CRM fields (Pro / Team only — enforced by the database)
  met_at: z.string().date().nullable().optional(),
  met_where_type: z.enum(MET_WHERE_TYPES).nullable().optional(),
  met_where_text: optionalText(200),
  note: optionalText(5000),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  status: z.enum(CONTACT_STATUSES).default('new'),
  follow_up_at: z.string().date().nullable().optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

/** Public "leave my details" form (contact-exchange). */
export const exchangeSchema = z
  .object({
    name: z.string().trim().min(1, 'errors.required').max(120, 'errors.tooLong'),
    phone: z.string().trim().max(40).optional().default(''),
    email: z.string().trim().max(254).optional().default(''),
    company: z.string().trim().max(80).optional().default(''),
    title: z.string().trim().max(80).optional().default(''),
    message: z.string().trim().max(300, 'errors.tooLong').optional().default(''),
    consent: z.literal(true, { errorMap: () => ({ message: 'errors.consentRequired' }) }),
  })
  .superRefine((v, ctx) => {
    if (!v.phone && !v.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'errors.phoneOrEmail' });
    }
    if (v.phone && !phoneSchema.safeParse(v.phone).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'errors.invalidPhone' });
    }
    if (v.email && !emailSchema.safeParse(v.email).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'errors.invalidEmail' });
    }
  });
export type ExchangeInput = z.infer<typeof exchangeSchema>;

/** Upload rules mirrored from the storage buckets (≤ 2 MB, jpeg/png/webp). */
export const IMAGE_UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
};

export function validateImageFile(file: {
  size: number;
  type: string;
}): 'ok' | 'errors.fileTooLarge' | 'errors.fileType' {
  if (!(IMAGE_UPLOAD.mimeTypes as readonly string[]).includes(file.type)) return 'errors.fileType';
  if (file.size > IMAGE_UPLOAD.maxBytes) return 'errors.fileTooLarge';
  return 'ok';
}
