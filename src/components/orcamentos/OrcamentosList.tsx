import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Orcamento {
  id: string;
  business_unit_id: string;
  business_unit_name: string;
  limit_amount: number;
  month: string;
  alert_threshold?: number;
}

interface OrcamentosListProps {
  orcamentos: Orcamento[];
  gastosPorUnidade: Record<string, number>;
  onEdit: (orcamento: Orcamento) => void;
  onDelete: (id: string) => void;
}

const OrcamentosList = ({ orcamentos, gastosPorUnidade, onEdit, onDelete }: OrcamentosListProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (orcamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma meta definida para este mês. Clique em "Nova Meta" para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todas as Metas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade de Negócio</TableHead>
              <TableHead className="text-right">Limite</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead className="text-center">Alerta (%)</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamentos.map((orcamento) => {
              const gasto = gastosPorUnidade[orcamento.business_unit_id] || 0;
              const disponivel = orcamento.limit_amount - gasto;
              const alertThreshold = orcamento.alert_threshold || 80;

              return (
                <TableRow key={orcamento.id}>
                  <TableCell className="font-medium">{orcamento.business_unit_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(orcamento.limit_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(gasto)}</TableCell>
                  <TableCell className={`text-right font-medium ${disponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(disponivel)}
                  </TableCell>
                  <TableCell className="text-center">{alertThreshold}%</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(orcamento)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a meta da unidade "{orcamento.business_unit_name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(orcamento.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default OrcamentosList;
