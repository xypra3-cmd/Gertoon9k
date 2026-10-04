// Metadata of the 10 card templates (each with two color variants a/b).
export interface TemplateColor {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
}

export interface TemplateMeta {
  id: TemplateId;
  name: { mn: string; en: string };
  colors: { a: TemplateColor; b: TemplateColor };
  /** whether the layout shows a large photo/avatar */
  photo: boolean;
}

export const TEMPLATE_IDS = [
  'classic',
  'modern',
  'minimal',
  'corporate',
  'creative',
  'dark',
  'profile',
  'business',
  'executive',
  'premium',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATES: readonly TemplateMeta[] = [
  {
    id: 'classic',
    name: { mn: 'Сонгодог', en: 'Classic' },
    photo: false,
    colors: {
      a: { bg: '#FFFFFF', fg: '#111827', accent: '#1D4ED8', muted: '#6B7280' },
      b: { bg: '#F8F5EE', fg: '#1F2937', accent: '#9A3412', muted: '#726B66' },
    },
  },
  {
    id: 'modern',
    name: { mn: 'Орчин үеийн', en: 'Modern' },
    photo: true,
    colors: {
      a: { bg: '#F1F5F9', fg: '#0F172A', accent: '#006FB3', muted: '#5E6E85' },
      b: { bg: '#ECFDF5', fg: '#052E16', accent: '#007E51', muted: '#4B5563' },
    },
  },
  {
    id: 'minimal',
    name: { mn: 'Минимал', en: 'Minimal' },
    photo: false,
    colors: {
      a: { bg: '#FFFFFF', fg: '#000000', accent: '#000000', muted: '#737373' },
      b: { bg: '#FAFAF9', fg: '#292524', accent: '#A16207', muted: '#726B66' },
    },
  },
  {
    id: 'corporate',
    name: { mn: 'Корпорэйт', en: 'Corporate' },
    photo: false,
    colors: {
      a: { bg: '#FFFFFF', fg: '#0B1F44', accent: '#1E40AF', muted: '#475569' },
      b: { bg: '#0B1F44', fg: '#FFFFFF', accent: '#60A5FA', muted: '#CBD5E1' },
    },
  },
  {
    id: 'creative',
    name: { mn: 'Бүтээлч', en: 'Creative' },
    photo: true,
    colors: {
      a: { bg: '#FFF7ED', fg: '#431407', accent: '#CC3A00', muted: '#9A3412' },
      b: { bg: '#FDF4FF', fg: '#3B0764', accent: '#BA20CD', muted: '#6B21A8' },
    },
  },
  {
    id: 'dark',
    name: { mn: 'Бараан', en: 'Dark' },
    photo: true,
    colors: {
      a: { bg: '#0A0A0A', fg: '#FAFAFA', accent: '#22D3EE', muted: '#A3A3A3' },
      b: { bg: '#111827', fg: '#F9FAFB', accent: '#FBBF24', muted: '#9CA3AF' },
    },
  },
  {
    id: 'profile',
    name: { mn: 'Профайл', en: 'Profile' },
    photo: true,
    colors: {
      a: { bg: '#FFFFFF', fg: '#111827', accent: '#7C3AED', muted: '#6B7280' },
      b: { bg: '#F0F9FF', fg: '#0C4A6E', accent: '#0072B5', muted: '#475569' },
    },
  },
  {
    id: 'business',
    name: { mn: 'Бизнес', en: 'Business' },
    photo: false,
    colors: {
      a: { bg: '#FFFFFF', fg: '#1F2937', accent: '#047857', muted: '#6B7280' },
      b: { bg: '#F3F4F6', fg: '#111827', accent: '#B91C1C', muted: '#4B5563' },
    },
  },
  {
    id: 'executive',
    name: { mn: 'Удирдлага', en: 'Executive' },
    photo: true,
    colors: {
      a: { bg: '#1C1917', fg: '#F5F5F4', accent: '#D4AF37', muted: '#A8A29E' },
      b: { bg: '#FFFFFF', fg: '#1C1917', accent: '#854D0E', muted: '#57534E' },
    },
  },
  {
    id: 'premium',
    name: { mn: 'Премиум', en: 'Premium' },
    photo: true,
    colors: {
      a: { bg: '#0F172A', fg: '#F8FAFC', accent: '#E2C275', muted: '#94A3B8' },
      b: { bg: '#FAF7F2', fg: '#1E1B4B', accent: '#4338CA', muted: '#5E6E85' },
    },
  },
];

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? (TEMPLATES[0] as TemplateMeta);
}
