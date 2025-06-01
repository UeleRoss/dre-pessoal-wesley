
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Lancamentos from './pages/Lancamentos';
import Contas from './pages/Contas';
import Investimentos from './pages/Investimentos';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toaster';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/lancamentos" replace />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="contas" element={<Contas />} />
            <Route path="investimentos" element={<Investimentos />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
