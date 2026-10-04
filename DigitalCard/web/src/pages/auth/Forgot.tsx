import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field } from '@/components/ui';
import { AuthCard } from './Login';

export default function Forgot() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>();
  const onSubmit = async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'success', text: t('authx.resetSent') });
  };
  return (
    <AuthCard title={t('auth.forgot')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label={t('auth.email')} htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            {...register('email', { required: true })}
          />
        </Field>
        {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
        <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
          {t('auth.forgot')}
        </button>
      </form>
    </AuthCard>
  );
}
