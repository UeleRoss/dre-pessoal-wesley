
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import Contas from './pages/Contas';
import Investimentos from './pages/Investimentos';
import Orcamentos from './pages/Orcamentos';
import FluxoCaixa from './pages/FluxoCaixa';
import NotFound from './pages/NotFound';
import Auth from './components/Auth';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { useUserProfile } from './hooks/useUserProfile';
import { Toaster } from './components/ui/toaster';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile, isLoading: isLoadingProfile } = useUserProfile();

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mostrar loading enquanto verifica autenticação
  if (loading || (user && isLoadingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-navy-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar tela de login
  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  // Se estiver autenticado mas não completou o onboarding, mostrar onboarding
  if (profile && !profile.onboarding_completed) {
    return <OnboardingFlow onComplete={() => window.location.reload()} />;
  }

  // Se tudo estiver ok, mostrar aplicação normal
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="lancamentos" element={<Lancamentos />} />
          <Route path="contas" element={<Contas />} />
          <Route path="investimentos" element={<Investimentos />} />
          <Route path="orcamentos" element={<Orcamentos />} />
          <Route path="fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
