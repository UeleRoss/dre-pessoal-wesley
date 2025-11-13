import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { initDatabase } from "@/services/database";
import { importHistoricalData } from "@/services/import-data";
import Lancamentos from "@/pages/Lancamentos";
import Contas from "@/pages/Contas";
import Layout from "@/components/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        console.log('🚀 Inicializando aplicação...');

        // Inicializar banco de dados
        await initDatabase();

        // Verificar se precisa importar dados
        const needsImport = !localStorage.getItem('data-imported');
        if (needsImport) {
          console.log('📥 Primeira execução - importando dados históricos...');
          await importHistoricalData();
          localStorage.setItem('data-imported', 'true');
        }

        setIsInitialized(true);
        console.log('✅ Aplicação pronta!');
      } catch (err) {
        console.error('❌ Erro ao inicializar:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    }

    initialize();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando DRE Pessoal...</p>
          <p className="text-gray-400 text-sm mt-2">Inicializando banco de dados local</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/lancamentos" replace />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/contas" element={<Contas />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
