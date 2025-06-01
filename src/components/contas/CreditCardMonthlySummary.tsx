
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
    
    console.log("🔧 CreditCardMonthlySummary - Calculando totais para mês:", format(selectedMonth, "yyyy-MM"));
    console.log("🔧 CreditCardMonthlySummary - Cobranças ativas:", charges.filter(c => c.ativo));
    
    charges
      .filter(charge => charge.ativo)
      .forEach(charge => {
        const chargeDate = new Date(charge.created_at);
        let monthlyValue = 0;
        
        console.log(`🔧 Processando cobrança: ${charge.description} - Tipo: ${charge.type}`);
        
        if (charge.type === 'recorrente') {
          // Para recorrentes, sempre incluir o valor total no mês selecionado
          monthlyValue = charge.value;
          console.log(`🔧 Recorrente: ${charge.description} = R$ ${monthlyValue}`);
        } else if (charge.type === 'parcelado' && charge.parcelas) {
          // Para parceladas, calcular se a parcela do mês selecionado existe
          const chargeStart = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1);
          const selectedStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
          
          // Calcular diferença em meses desde o início da cobrança
          const monthsDiff = (selectedStart.getFullYear() - chargeStart.getFullYear()) * 12 + 
                            (selectedStart.getMonth() - chargeStart.getMonth());
          
          // Se está dentro do período de parcelas (0 = primeiro mês, 1 = segundo mês, etc)
          if (monthsDiff >= 0 && monthsDiff < charge.parcelas) {
            monthlyValue = charge.value / charge.parcelas;
            console.log(`🔧 Parcelado: ${charge.description} - Parcela ${monthsDiff + 1}/${charge.parcelas} = R$ ${monthlyValue} (Valor total: R$ ${charge.value})`);
          } else {
            console.log(`🔧 Parcelado: ${charge.description} - Fora do período (mês ${monthsDiff + 1} de ${charge.parcelas})`);
          }
        } else if (charge.type === 'avulso') {
          // Para avulso, incluir apenas se for do mesmo mês da criação
          const chargeMonth = format(chargeDate, "yyyy-MM");
          const selectedMonthStr = format(selectedMonth, "yyyy-MM");
          
          if (chargeMonth === selectedMonthStr) {
            monthlyValue = charge.value;
            console.log(`🔧 Avulso: ${charge.description} = R$ ${monthlyValue}`);
          } else {
            console.log(`🔧 Avulso: ${charge.description} - Não é do mês selecionado`);
          }
        }
        
        if (monthlyValue > 0) {
          if (!totals[charge.card]) {
            totals[charge.card] = 0;
          }
          totals[charge.card] += monthlyValue;
          console.log(`🔧 Total acumulado ${charge.card}: R$ ${totals[charge.card]}`);
        }
      });
    
    console.log("🔧 Totais finais por cartão:", totals);
    return totals;
  };

  const monthlyTotals = calculateMonthlyTotals();
  const cards = Object.keys(monthlyTotals);
  const grandTotal = Object.values(monthlyTotals).reduce((sum, value) => sum + value, 0);

  console.log("🔧 Total geral calculado:", grandTotal);

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
