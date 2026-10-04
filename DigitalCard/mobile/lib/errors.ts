import { errorKey } from '@digitalcard/shared/errors';
import type { T } from './i18n';

export const errorText = (t: T, err: unknown) => {
  const msg = (err as { message?: string })?.message;
  if (msg === 'Invalid login credentials') return t('errors.invalid');
  return t(errorKey(err));
};
