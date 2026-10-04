import { errorKey } from '@digitalcard/shared';
import { useI18n } from '@/i18n/I18nProvider';

/** Turns Supabase / function errors into a friendly localized message. */
export function useErrorText() {
  const { t } = useI18n();
  return (err: unknown): string => {
    const e = err as { message?: string; error?: string } | null;
    const raw = e?.message ?? e?.error;
    if (raw === 'admin_mfa_required' || raw === 'org_owner_must_transfer' || raw === 'qpay_unavailable') return t(`errorsx.${raw}`);
    if (raw === 'Invalid login credentials') return t('authx.invalidCredentials');
    return t(errorKey(err));
  };
}
