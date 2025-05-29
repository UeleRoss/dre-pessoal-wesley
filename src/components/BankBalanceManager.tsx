
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Bancos fixos do sistema
const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

const BankBalanceManager = () => {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar saldos iniciais configurados
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Mutation para salvar/atualizar saldos
  const saveBankBalancesMutation = useMutation({
    mutationFn: async (bankBalances: Record<string, number>) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Data atual será a nova data de referência para os cálculos
      const configDate = new Date().toISOString();

      const updates = Object.entries(bankBalances).map(([bank, balance]) => ({
        user_id: user.data.user.id,
        bank_name: bank,
        initial_balance: balance,
        updated_at: configDate // Usar como data de referência
      }));

      // Usar upsert para inserir ou atualizar
      const { error } = await supabase
        .from('bank_balances')
        .upsert(updates, { 
          onConflict: 'user_id,bank_name',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      toast({
        title: "Saldos configurados",
        description: "Saldos iniciais atualizados! A partir de agora, apenas novos lançamentos serão considerados.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar saldos iniciais.",
        variant: "destructive",
      });
    }
  });

  // Inicializar balances com valores salvos
  React.useEffect(() => {
    const initialBalances: Record<string, number> = {};
    BANKS.forEach(bank => {
      const existingBalance = bankBalances.find(b => b.bank_name === bank);
      initialBalances[bank] = existingBalance?.initial_balance || 0;
    });
    setBalances(initialBalances);
  }, [bankBalances]);

  const handleBalanceChange = (bank: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBalances(prev => ({ ...prev, [bank]: numValue }));
  };

  const handleSave = () => {
    saveBankBalancesMutation.mutate(balances);
  };

  const handleReset = () => {
    const resetBalances: Record<string, number> = {};
    BANKS.forEach(bank => {
      resetBalances[bank] = 0;
    });
    setBalances(resetBalances);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Configurar Saldos Iniciais dos Bancos
          <Badge variant="outline">Setup Inicial</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Importante:</strong> Ao configurar estes saldos, o sistema irá ignorar todos os lançamentos anteriores. 
            A partir desta configuração, apenas os novos lançamentos que você fizer serão considerados no cálculo dos saldos.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BANKS.map((bank) => (
            <div key={bank} className="space-y-2">
              <label className="text-sm font-medium">{bank}</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balances[bank] || ''}
                  onChange={(e) => handleBalanceChange(bank, e.target.value)}
                />
                <div className="text-xs text-gray-500 self-center min-w-20">
                  {formatCurrency(balances[bank] || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave}
            disabled={saveBankBalancesMutation.isPending}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Configurar Saldos
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankBalanceManager;
