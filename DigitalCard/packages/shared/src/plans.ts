// UI descriptions of plans ONLY. Prices and limits are read from the `plans` table at runtime —
// never hard-code them in apps. Mobile apps must not display prices at all (store rules).
import type { PlanId } from './types';

export interface PlanCopy {
  id: PlanId;
  /** i18n keys of the bullet points shown on the pricing section */
  featureKeys: string[];
  highlight?: boolean;
}

export const PLAN_COPY: Record<PlanId, PlanCopy> = {
  free: {
    id: 'free',
    featureKeys: [
      'plans.features.oneCard',
      'plans.features.qrVcard',
      'plans.features.exchangeLimited',
      'plans.features.basicStats',
    ],
  },
  pro: {
    id: 'pro',
    highlight: true,
    featureKeys: [
      'plans.features.fiveCards',
      'plans.features.qrVcard',
      'plans.features.exchangeUnlimited',
      'plans.features.crm',
      'plans.features.followup',
      'plans.features.funnel',
    ],
  },
  team: {
    id: 'team',
    featureKeys: [
      'plans.features.cardPerMember',
      'plans.features.crm',
      'plans.features.branding',
      'plans.features.lockedTemplate',
      'plans.features.teamDashboard',
    ],
  },
};

/** Monthly amount for a plan row from the DB (team = per seat × max(seats, min_seats)). */
export function planMonthlyAmount(
  plan: { id: string; price_mnt: number; price_per_seat_mnt: number; min_seats: number },
  seats = 1,
): number {
  if (plan.id === 'team') return plan.price_per_seat_mnt * Math.max(seats, plan.min_seats);
  return plan.price_mnt;
}

export type BillingPeriod = 'month' | 'year';

/** Amount for one billing period from the DB plan row. Annual prices live in plans.price_*_annual_mnt. */
export function planAmount(
  plan: {
    id: string;
    price_mnt: number;
    price_per_seat_mnt: number;
    price_annual_mnt: number;
    price_per_seat_annual_mnt: number;
    min_seats: number;
  },
  period: BillingPeriod,
  seats = 1,
): number {
  if (period === 'month') return planMonthlyAmount(plan, seats);
  if (plan.id === 'team') return plan.price_per_seat_annual_mnt * Math.max(seats, plan.min_seats);
  return plan.price_annual_mnt;
}

/** Percent saved by paying yearly instead of 12 × monthly (0 when no annual price). */
export function annualSavingPercent(monthly: number, annual: number): number {
  if (!monthly || !annual) return 0;
  return Math.max(0, Math.round((1 - annual / (monthly * 12)) * 100));
}

export function formatMnt(amount: number, locale: 'mn' | 'en' = 'mn'): string {
  const n = new Intl.NumberFormat(locale === 'mn' ? 'mn-MN' : 'en-US').format(amount);
  return `${n}₮`;
}
