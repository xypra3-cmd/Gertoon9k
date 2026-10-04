import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';

/** Everything that needs a session lives under this lazily-loaded shell (keeps supabase-js out of the public card bundle). */
export default function AuthShell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
