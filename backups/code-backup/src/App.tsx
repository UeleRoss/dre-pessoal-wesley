
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lancamentos from "./pages/Lancamentos";
import Contas from "./pages/Contas";
import Auth from "./components/Auth";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";
import "./App.css";
import { authService, type LocalUser } from "@/services/auth-service";

const queryClient = new QueryClient();

const NavBar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();

  const links = [
    { to: "/lancamentos", label: "Lançamentos" },
    { to: "/contas", label: "Contas" },
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="text-lg font-semibold tracking-tight">Meu Financeiro V2</span>
        <nav className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
};

function AppContent() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.getSession().then((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center text-slate-500">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <Router>
      <NavBar onLogout={handleLogout} />
      <main className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/lancamentos" replace />} />
            <Route path="/lancamentos" element={<Lancamentos user={user} />} />
            <Route path="/contas" element={<Contas user={user} />} />
            <Route path="*" element={<Navigate to="/lancamentos" replace />} />
          </Routes>
        </div>
      </main>
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
