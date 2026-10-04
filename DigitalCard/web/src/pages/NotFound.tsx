import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md p-12 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t('errorsx.pageNotFound')}</h1>
      <Link to="/" className="btn-secondary mt-6">
        {t('common.back')}
      </Link>
    </div>
  );
}
