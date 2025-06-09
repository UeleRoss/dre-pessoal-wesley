
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import BankCard from "@/components/BankCard";
import BankBalanceManager from "@/components/BankBalanceManager";
import { useCalculatedBankBalances } from "@/hooks/useBankBalances";
import { FinancialItem } from "@/types/financial";

interface BankBalancesSectionProps {
  bankBalances: any[];
  availableBanks: string[];
  allItems: FinancialItem[];
  periodItems: FinancialItem[];
}

const BankBalancesSection = ({
  bankBalances,
  availableBanks,
  allItems,
  periodItems
}: BankBalancesSectionProps) => {
  const [showBankSetup, setShowBankSetup] = useState(false);
  
  const calculatedBankBalances = useCalculatedBankBalances(
    availableBanks,
    bankBalances,
    allItems,
    periodItems
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-navy-800">Saldos por Banco</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBankSetup(true)}
            className="text-xs md:text-sm"
          >
            <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Setup
          </Button>
        </div>
        
        {calculatedBankBalances.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {calculatedBankBalances.map((bank) => (
              <BankCard
                key={bank.name}
                name={bank.name}
                balance={bank.balance}
                previousBalance={bank.previousBalance}
                className="text-xs md:text-sm p-3 md:p-4"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 md:py-8 text-gray-500">
            <p className="text-sm md:text-base mb-2">Configure os saldos iniciais dos bancos para visualizar o resumo</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBankSetup(true)}
              className="text-xs md:text-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Saldos
            </Button>
          </div>
        )}
      </div>

      {/* Bank Setup Modal */}
      {showBankSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold">Setup de Saldos dos Bancos</h2>
                <Button variant="ghost" onClick={() => setShowBankSetup(false)} className="text-lg md:text-xl">×</Button>
              </div>
              <BankBalanceManager />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BankBalancesSection;
