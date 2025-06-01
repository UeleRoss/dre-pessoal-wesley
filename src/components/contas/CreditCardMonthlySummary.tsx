
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditCardCharge {
  id: string;
  description: string;
  card: string;
  value: number;
  type: string;
  parcelas?: number;
  ativo: boolean;
  created_at: string;
}

interface CreditCardMonthlySummaryProps {
  charges: CreditCardCharge[];
  selectedMonth: Date;
}

const CreditCardMonthlySummary = ({ charges, selectedMonth }: CreditCardMonthlySummaryProps) => {
  // Calcular totais por cartão para o mês selecionado
  const calculateMonthlyTotals = () => {
    const totals: Record<string, number> = {};
    
    const selectedMonthStr = format(selectedMonth, "yyyy-MM");
    
    charges
      .filter(charge => charge.ativo)
      .forEach(charge => {
        const chargeDate = new Date(charge.created_at);
        
        let monthlyValue = 0;
        
        if (charge.type === 'recorrente') {
          // Para recorrentes, sempre incluir o valor total
          monthlyValue = charge.value;
        } else if (charge.type === 'parcelado' && charge.parcelas) {
          // Para parceladas, calcular se a parcela do mês selecionado existe
          const chargeStartMonth = format(chargeDate, "yyyy-MM");
          const chargeStart = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1);
          const selectedStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
          
          // Calcular diferença em meses
          const monthsDiff = (selectedStart.getFullYear() - chargeStart.getFullYear()) * 12 + 
                            (selectedStart.getMonth() - chargeStart.getMonth());
          
          // Se está dentro do período de parcelas
          if (monthsDiff >= 0 && monthsDiff < charge.parcelas) {
            monthlyValue = charge.value / charge.parcelas;
          }
        }
        
        if (monthlyValue > 0) {
          if (!totals[charge.card]) {
            totals[charge.card] = 0;
          }
          totals[charge.card] += monthlyValue;
        }
      });
    
    return totals;
  };

  const monthlyTotals = calculateMonthlyTotals();
  const cards = Object.keys(monthlyTotals);
  const grandTotal = Object.values(monthlyTotals).reduce((sum, value) => sum + value, 0);

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumo Mensal por Cartão</CardTitle>
          <p className="text-sm text-gray-600">
            {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <p>Nenhuma cobrança ativa para este mês.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Mensal por Cartão</CardTitle>
        <p className="text-sm text-gray-600">
          {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {cards.map((card) => (
            <div key={card} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{card}</Badge>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">
                  {monthlyTotals[card].toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-3">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total Geral:</span>
            <span className="text-red-600">
              {grandTotal.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardMonthlySummary;
