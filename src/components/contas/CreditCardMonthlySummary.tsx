
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
        let monthlyValue = 0;
        
        console.log(`🔧 Processando cobrança: ${charge.description} - Tipo: ${charge.type} - Valor: R$ ${charge.value}`);
        
        if (charge.type === 'recorrente') {
          // Para recorrentes, usar o valor diretamente
          monthlyValue = charge.value;
          console.log(`🔧 Recorrente: ${charge.description} = R$ ${monthlyValue}`);
        } else if (charge.type === 'parcelado') {
          // Para parceladas, o valor já representa a parcela do mês - não dividir
          monthlyValue = charge.value;
          console.log(`🔧 Parcelado: ${charge.description} = R$ ${monthlyValue} (valor já é da parcela)`);
        } else if (charge.type === 'avulso') {
          // Para avulso, usar o valor diretamente
          monthlyValue = charge.value;
          console.log(`🔧 Avulso: ${charge.description} = R$ ${monthlyValue}`);
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
