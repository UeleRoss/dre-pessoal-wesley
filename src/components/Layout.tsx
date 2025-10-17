
import { Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Receipt,
  CreditCard,
  TrendingUp,
  PiggyBank,
  BarChart3,
  Target,
  LineChart,
  LogOut
} from "lucide-react";
import UserNameEditor from "./UserNameEditor";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Lançamentos", href: "/lancamentos", icon: Receipt },
  { name: "Cartões", href: "/cartoes", icon: CreditCard },
  { name: "Contas", href: "/contas", icon: TrendingUp },
  { name: "Investimentos", href: "/investimentos", icon: PiggyBank },
  { name: "Orçamentos", href: "/orcamentos", icon: Target },
  { name: "Fluxo Caixa", href: "/fluxo-caixa", icon: LineChart },
];

const Layout = () => {
  const location = useLocation();
  const { profile, updateProfile } = useUserProfile();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      window.location.reload();
    }
  };

  const handleNameChange = (newName: string) => {
    updateProfile({ display_name: newName });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100 w-full">
      {/* Header */}
      <header className="gradient-bg shadow-lg sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">
                    DRE Pessoal {profile?.display_name ? `da ${profile.display_name}` : ''}
                  </h1>
                  <UserNameEditor
                    currentName={profile?.display_name || 'Usuário'}
                    onNameChange={handleNameChange}
                  />
                </div>
                <p className="text-navy-200 text-sm">Controle Financeiro Pessoal</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-orange-500 text-white shadow-lg"
                        : "text-navy-200 hover:bg-navy-600 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-navy-200 hover:bg-navy-600 hover:text-white ml-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-navy-600">
          <div className="w-full px-4">
            <div className="flex justify-around py-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200",
                      isActive
                        ? "text-orange-400"
                        : "text-navy-300 hover:text-orange-300"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs mt-1">{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 text-navy-300 hover:text-orange-300"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-xs mt-1">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
