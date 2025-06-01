
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface CreditCardCharge {
  id: string;
  description: string;
  card: string;
  value: number;
  type: string;
  parcelas?: number;
  observacao?: string;
  ativo: boolean;
}

interface CreditCardChargesListProps {
  charges: CreditCardCharge[];
  onEdit: (charge: CreditCardCharge) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, ativo: boolean) => void;
}

const CreditCardChargesList = ({ charges, onEdit, onDelete, onToggleStatus }: CreditCardChargesListProps) => {
  if (charges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma cobrança cadastrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Cartão</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Parcelas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {charges.map((charge) => (
            <TableRow key={charge.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{charge.description}</p>
                  {charge.observacao && (
                    <p className="text-xs text-gray-500">{charge.observacao}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{charge.card}</Badge>
              </TableCell>
              <TableCell className="font-mono">
                {charge.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell>
                <Badge variant={charge.type === 'recorrente' ? 'default' : 'secondary'}>
                  {charge.type}
                </Badge>
              </TableCell>
              <TableCell>
                {charge.type === 'parcelado' ? charge.parcelas || '-' : '-'}
              </TableCell>
              <TableCell>
                <Badge variant={charge.ativo ? 'default' : 'destructive'}>
                  {charge.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(charge.id, !charge.ativo)}
                  >
                    {charge.ativo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(charge)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(charge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CreditCardChargesList;
