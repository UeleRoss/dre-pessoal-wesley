import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, CheckCircle, XCircle, Eye } from "lucide-react";
import { CreditCardInvoice } from "@/types/financial";
import { formatBrazilDate } from "@/utils/dateUtils";

interface InvoiceCardProps {
  invoice: CreditCardInvoice;
  onViewDetails: (invoice: CreditCardInvoice) => void;
  onMarkAsPaid: (creditCardId: string, referenceMonth: string) => void;
}

const InvoiceCard = ({ invoice, onViewDetails, onMarkAsPaid }: InvoiceCardProps) => {
  const referenceDate = new Date(invoice.reference_month);
  const monthName = referenceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: invoice.color + '20' }}
            >
              <CreditCard
                className="h-5 w-5"
                style={{ color: invoice.color }}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{invoice.card_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600 capitalize">{monthName}</span>
              </div>
            </div>
          </div>
          {invoice.is_paid ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Paga
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Amount */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Valor Total da Fatura</div>
          <div className="text-2xl font-bold text-gray-900">
            {Number(invoice.total_amount).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-xs text-blue-700 mb-1">Total Itens</div>
            <div className="text-lg font-semibold text-blue-900">{invoice.total_items}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-xs text-purple-700 mb-1">Recorrentes</div>
            <div className="text-lg font-semibold text-purple-900">{invoice.recurring_items}</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-2">
            <div className="text-xs text-pink-700 mb-1">Parceladas</div>
            <div className="text-lg font-semibold text-pink-900">{invoice.installment_items}</div>
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Vencimento:</span>
          <span className="font-medium">Dia {invoice.due_day} de cada mês</span>
        </div>

        {/* Payment Date if paid */}
        {invoice.is_paid && invoice.payment_date && (
          <div className="flex items-center justify-between text-sm bg-green-50 rounded-lg p-2">
            <span className="text-green-700">Pago em:</span>
            <span className="font-medium text-green-900">
              {formatBrazilDate(invoice.payment_date)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails(invoice)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
          {!invoice.is_paid && (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onMarkAsPaid(invoice.credit_card_id, invoice.reference_month)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Paga
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;
