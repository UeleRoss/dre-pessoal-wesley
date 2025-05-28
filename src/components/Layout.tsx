
import { Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  CreditCard,
  TrendingUp
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/lancamentos", icon: Receipt },
  { name: "Análise", href: "/analise", icon: BarChart3 },
  { name: "Contas", href: "/contas", icon: CreditCard },
];

const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100">
      {/* Header */}
      <header className="gradient-bg shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DRE Pessoal Wesley</h1>
                <p className="text-navy-200 text-sm">Controle Financeiro Pessoal</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
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
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-navy-600">
          <div className="max-w-7xl mx-auto px-4">
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
