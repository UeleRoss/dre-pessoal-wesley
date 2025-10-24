import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type SupabaseUser = {
  id: string;
  email?: string;
};

type FinancialItem = {
  id: string;
  user_id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  category: string | null;
  bank: string | null;
  source?: string | null;
};

type FinancialItemFormValues = {
  date: string;
  type: "entrada" | "saida";
  description: string;
  amount: string;
  category: string;
  bank: string;
};

const normalizeType = (value: string) => {
  const normalized = value?.toLowerCase?.() ?? "";
  if (normalized === "receita") return "entrada";
  if (normalized === "despesa") return "saida";
  return (["entrada", "saida"].includes(normalized) ? normalized : "saida") as "entrada" | "saida";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const buildCsv = (items: FinancialItem[]) => {
  const headers = ["date", "type", "description", "amount", "category", "bank", "source"];
  const rows = items.map((item) => [
    item.date,
    normalizeType(item.type),
    `"${(item.description || "").replace(/"/g, '""')}"`,
    item.amount.toFixed(2),
    `"${(item.category || "").replace(/"/g, '""')}"`,
    `"${(item.bank || "").replace(/"/g, '""')}"`,
    `"${(item.source || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};

const defaultFormValues = (initialDate: string): FinancialItemFormValues => ({
  date: initialDate,
  type: "saida",
  description: "",
  amount: "",
  category: "",
  bank: "",
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Tente novamente em instantes.";

const Lancamentos = ({ user }: { user: SupabaseUser }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [formValues, setFormValues] = useState<FinancialItemFormValues>(() => {
    const initialDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    return defaultFormValues(initialDate);
  });

  const periodLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return `${String(month).padStart(2, "0")}/${year}`;
  }, [selectedMonth]);

  const { data: financialItems = [], isLoading } = useQuery<FinancialItem[]>({
    queryKey: ["financial-items", user.id, selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, (month ?? 1) - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, (month ?? 1), 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("financial_items")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) {
        console.error("Erro ao buscar lançamentos:", error);
        throw error;
      }

      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    return financialItems.reduce(
      (acc, item) => {
        const type = normalizeType(item.type);
        if (type === "entrada") {
          acc.entradas += Number(item.amount) || 0;
        } else {
          acc.saidas += Number(item.amount) || 0;
        }
        return acc;
      },
      { entradas: 0, saidas: 0 }
    );
  }, [financialItems]);

  const balance = totals.entradas - totals.saidas;

  const resetForm = () => {
    const [year, month] = selectedMonth.split("-");
    const initialDate = `${year}-${month}-${String(new Date().getDate()).padStart(2, "0")}`;
    setFormValues(defaultFormValues(initialDate));
    setEditingItem(null);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: FinancialItemFormValues) => {
      const amount = parseFloat(payload.amount.replace(",", "."));
      const sanitizedAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;

      const { error } = await supabase.from("financial_items").insert([
        {
          user_id: user.id,
          date: payload.date,
          type: payload.type,
          description: payload.description.trim(),
          amount: sanitizedAmount,
          category: payload.category.trim() || null,
          bank: payload.bank.trim() || null,
          source: "manual",
        },
      ]);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Lançamento criado" });
      queryClient.invalidateQueries({ queryKey: ["financial-items"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: "Não foi possível salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: FinancialItemFormValues & { id: string }) => {
      const amount = parseFloat(payload.amount.replace(",", "."));
      const sanitizedAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;

      const { error } = await supabase
        .from("financial_items")
        .update({
          date: payload.date,
          type: payload.type,
          description: payload.description.trim(),
          amount: sanitizedAmount,
          category: payload.category.trim() || null,
          bank: payload.bank.trim() || null,
        })
        .eq("id", payload.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Lançamento atualizado" });
      queryClient.invalidateQueries({ queryKey: ["financial-items"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: "Atualização falhou",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_items").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Lançamento removido" });
      queryClient.invalidateQueries({ queryKey: ["financial-items"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao remover",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValues.description || !formValues.amount) {
      toast({
        title: "Dados incompletos",
        description: "Descrição e valor são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ ...formValues, id: editingItem.id });
    } else {
      createMutation.mutate(formValues);
    }
  };

  const handleEdit = (item: FinancialItem) => {
    setEditingItem(item);
    setFormValues({
      date: item.date,
      type: normalizeType(item.type),
      description: item.description ?? "",
      amount: String(item.amount),
      category: item.category ?? "",
      bank: item.bank ?? "",
    });
    setIsFormOpen(true);
  };

  const handleExportCsv = () => {
    if (!financialItems.length) {
      toast({
        title: "Sem dados para exportar",
        description: "Nenhum lançamento encontrado no período selecionado.",
      });
      return;
    }

    const csv = buildCsv(financialItems);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lancamentos_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lançamentos</h1>
          <p className="text-sm text-slate-500">Organize entradas e saídas do mês {periodLabel}.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm text-slate-600">
            Mês
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <Button variant="outline" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          >
            Novo lançamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">Entradas</p>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.entradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">Saídas</p>
            <p className="text-xl font-semibold text-rose-600">{formatCurrency(totals.saidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">Saldo</p>
            <p className={`text-xl font-semibold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Banco</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Carregando lançamentos...
                    </td>
                  </tr>
                ) : financialItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      Nenhum lançamento encontrado para {periodLabel}.
                    </td>
                  </tr>
                ) : (
                  financialItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{new Date(item.date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            normalizeType(item.type) === "entrada"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {normalizeType(item.type) === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.description}</td>
                      <td className="px-4 py-3 text-slate-500">{item.category || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{item.bank || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {formatCurrency(Number(item.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Remover este lançamento?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Descrição</label>
              <input
                type="text"
                value={formValues.description}
                onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Valor</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formValues.amount}
                onChange={(event) => setFormValues((prev) => ({ ...prev, amount: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Data</label>
              <input
                type="date"
                value={formValues.date}
                onChange={(event) => setFormValues((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Tipo</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tipo"
                    value="entrada"
                    checked={formValues.type === "entrada"}
                    onChange={() => setFormValues((prev) => ({ ...prev, type: "entrada" }))}
                  />
                  Entrada
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tipo"
                    value="saida"
                    checked={formValues.type === "saida"}
                    onChange={() => setFormValues((prev) => ({ ...prev, type: "saida" }))}
                  />
                  Saída
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Categoria</label>
              <input
                type="text"
                value={formValues.category}
                onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ex.: Moradia, Alimentação, etc."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Banco/Conta</label>
              <input
                type="text"
                value={formValues.bank}
                onChange={(event) => setFormValues((prev) => ({ ...prev, bank: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Opcional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? "Salvar mudanças" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lancamentos;
