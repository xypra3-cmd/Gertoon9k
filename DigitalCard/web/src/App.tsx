import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from './i18n/I18nProvider';
import { Spinner } from './components/ui';

const PublicLayout = lazy(() => import('./components/PublicLayout'));
const AuthShell = lazy(() => import('./components/AuthShell'));
const AppLayout = lazy(() => import('./components/AppLayout'));
const Landing = lazy(() => import('./pages/Landing'));
const PublicCardPage = lazy(() => import('./pages/PublicCard'));
const Legal = lazy(() => import('./pages/Legal'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Forgot = lazy(() => import('./pages/auth/Forgot'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Welcome = lazy(() => import('./pages/app/Welcome'));
const CardEditor = lazy(() => import('./pages/app/CardEditor'));
const CardPrint = lazy(() => import('./pages/app/CardPrint'));
const Contacts = lazy(() => import('./pages/app/Contacts'));
const Stats = lazy(() => import('./pages/app/Stats'));
const Billing = lazy(() => import('./pages/app/Billing'));
const Org = lazy(() => import('./pages/app/Org'));
const Settings = lazy(() => import('./pages/app/Settings'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* Public card: no layout chrome, smallest bundle */}
              <Route path="/c/:slug" element={<PublicCardPage />} />
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/legal/:doc" element={<Legal />} />
              </Route>
              <Route element={<AuthShell />}>
                <Route element={<PublicLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot" element={<Forgot />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>
                <Route element={<AppLayout />}>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/app/welcome" element={<Welcome />} />
                  <Route path="/app/cards/:id" element={<CardEditor />} />
                  <Route path="/app/cards/:id/print" element={<CardPrint />} />
                  <Route path="/app/contacts" element={<Contacts />} />
                  <Route path="/app/contacts/:id" element={<Contacts />} />
                  <Route path="/app/stats" element={<Stats />} />
                  <Route path="/app/billing" element={<Billing />} />
                  <Route path="/app/org" element={<Org />} />
                  <Route path="/app/settings" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Route>
              <Route element={<PublicLayout />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}
