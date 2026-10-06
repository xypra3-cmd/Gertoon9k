import { useState } from 'react';
import { isStrongPassword } from '@digitalcard/shared/validation';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field } from '@/components/ui';
import { AuthCard } from './Login';

export default function ResetPassword() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ password: string }>();
  const onSubmit = async ({ password }: { password: string }) => {
    if (!isStrongPassword(password)) return setError(t('authx.passwordMin'));
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(errorText(err));
    else nav('/app', { replace: true });
  };
  return (
    <AuthCard title={t('authx.setPassword')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label={t('authx.newPassword')} htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            {...register('password')}
          />
        </Field>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
          {t('common.save')}
        </button>
      </form>
    </AuthCard>
  );
}
