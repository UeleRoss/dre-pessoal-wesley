import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CATEGORIES } from "@/constants/categories";

type SupabaseUser = {
  id: string;
  email?: string;
};

type RecurringBill = {
  id: string;
  user_id: string;
  name: string;
  value: number;
  due_date: number;
  category: string | null;
  bank: string | null;
};

type BillInstance = {
  id: string;
  bill_id: string;
  user_id: string;
  month_reference: string;
  valor_ajustado: number | null;
  pago: boolean;
};

type BillFormValues = {
  name: string;
  value: string;
  due_date: string;
  category: string;
  bank: string;
};

const emptyForm: BillFormValues = {
  name: "",
  value: "",
  due_date: "1",
  category: "",
  bank: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const toTitleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (word.length === 1) return word.toUpperCase();
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");

const formatBankName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/\s+/g, " ");
  const tokens = normalized.split(" ");
  const formattedTokens = tokens.map((token) => {
    if (!token) return "";
    const hasSpecial = /[^0-9A-Za-zÀ-ÖØ-öø-ÿ]/u.test(token);
    if (hasSpecial) {
      return token.toUpperCase();
    }
    if (token.length <= 2) {
      return token.toUpperCase();
    }
    const lower = token.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return formattedTokens.join(" ");
};

const buildCsv = (rows: Array<{ bill: RecurringBill; amount: number; isPaid: boolean; month: string }>) => {
  const header = ["month", "name", "value", "category", "bank", "status"];
  const payload = rows.map(({ bill, amount, isPaid, month }) => [
    month,
    `"${bill.name.replace(/"/g, '""')}"`,
    amount.toFixed(2),
    `"${(bill.category?.trim() || "").replace(/"/g, '""')}"`,
    `"${formatBankName(bill.bank ?? "").replace(/"/g, '""')}"`,
    isPaid ? "pago" : "pendente",
  ]);

  return [header.join(","), ...payload.map((row) => row.join(","))].join("\n");
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Tente novamente mais tarde.";

const Contas = ({ user }: { user: SupabaseUser }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const current = new Date();
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  });
  const monthReference = `${selectedMonth}-01`;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [formValues, setFormValues] = useState<BillFormValues>(emptyForm);
  const [categoryMode, setCategoryMode] = useState<"list" | "custom">("list");
  const [bankMode, setBankMode] = useState<"list" | "custom">("list");

  const { data: bills = [], isLoading: isLoadingBills } = useQuery<RecurringBill[]>({
    queryKey: ["recurring-bills", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_bills")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Erro ao buscar contas:", error);
        throw error;
      }

      return data ?? [];
    },
  });

  const { data: billInstances = [], isLoading: isLoadingInstances } = useQuery<BillInstance[]>({
    queryKey: ["recurring-bills-instances", user.id, monthReference],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_bills_instances")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_reference", monthReference);

      if (error) {
        console.error("Erro ao buscar instâncias de contas:", error);
        throw error;
      }

      return data ?? [];
    },
  });

  const displayBills = useMemo(() => {
    return bills.map((bill) => {
      const instance = billInstances.find((item) => item.bill_id === bill.id) ?? null;
      const amount = instance?.valor_ajustado ?? bill.value;

      return {
        bill,
        amount,
        isPaid: instance?.pago ?? false,
        instanceId: instance?.id ?? null,
      };
    });
  }, [bills, billInstances]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    const addOption = (value: string | null | undefined) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    };

    bills.forEach((bill) => addOption(bill.category));
    DEFAULT_CATEGORIES.forEach((category) => addOption(category));

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [bills]);

  const bankOptions = useMemo(() => {
    const map = new Map<string, string>();
    const addBank = (value: string | null | undefined) => {
      if (!value) return;
      const formatted = formatBankName(value);
      if (!formatted) return;
      const key = formatted.toLowerCase();
      if (!map.has(key)) {
        map.set(key, formatted);
      }
    };

    bills.forEach((bill) => addBank(bill.bank));

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [bills]);

  const totals = useMemo(() => {
    const total = displayBills.reduce((acc, item) => acc + item.amount, 0);
    const paid = displayBills.filter((item) => item.isPaid).reduce((acc, item) => acc + item.amount, 0);
    return {
      total,
      paid,
      pending: total - paid,
    };
  }, [displayBills]);

  useEffect(() => {
    if (categoryMode !== "list") return;
    if (categoryOptions.length === 0) return;
    if (categoryOptions.includes(formValues.category)) return;
    setFormValues((prev) => ({ ...prev, category: categoryOptions[0] }));
  }, [categoryMode, categoryOptions, formValues.category]);

  useEffect(() => {
    if (bankMode !== "list") return;
    if (bankOptions.length === 0) return;
    const formatted = formatBankName(formValues.bank);
    if (formatted && bankOptions.includes(formatted)) return;
    setFormValues((prev) => ({ ...prev, bank: bankOptions[0] ?? "" }));
  }, [bankMode, bankOptions, formValues.bank]);

  const resetForm = () => {
    setFormValues(emptyForm);
    setEditingBill(null);
    setCategoryMode("list");
    setBankMode("list");
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring-bills"] });
    queryClient.invalidateQueries({ queryKey: ["recurring-bills-instances"] });
  };

  const createBillMutation = useMutation({
    mutationFn: async (payload: BillFormValues) => {
      const value = Math.abs(Number(payload.value));
      const sanitizedCategory = payload.category.trim();
      const sanitizedBank = formatBankName(payload.bank);
      const { error } = await supabase.from("recurring_bills").insert({
        user_id: user.id,
        name: payload.name.trim(),
        value,
        due_date: Number(payload.due_date),
        category: sanitizedCategory || null,
        bank: sanitizedBank || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conta criada" });
      invalidateQueries();
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

  const updateBillMutation = useMutation({
    mutationFn: async (payload: BillFormValues & { id: string }) => {
      const value = Math.abs(Number(payload.value));
      const sanitizedCategory = payload.category.trim();
      const sanitizedBank = formatBankName(payload.bank);
      const { error } = await supabase
        .from("recurring_bills")
        .update({
          name: payload.name.trim(),
          value,
          due_date: Number(payload.due_date),
          category: sanitizedCategory || null,
          bank: sanitizedBank || null,
        })
        .eq("id", payload.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conta atualizada" });
      invalidateQueries();
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: "Não foi possível atualizar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_bills").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conta removida" });
      invalidateQueries();
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao remover",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ bill, isPaid }: { bill: RecurringBill; isPaid: boolean }) => {
      const existingInstance = billInstances.find((instance) => instance.bill_id === bill.id) ?? null;

      if (existingInstance) {
        const { error } = await supabase
          .from("recurring_bills_instances")
          .update({ pago: isPaid })
          .eq("id", existingInstance.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_bills_instances").insert({
          user_id: user.id,
          bill_id: bill.id,
          month_reference: monthReference,
          pago: isPaid,
          valor_ajustado: null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao atualizar status",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const adjustValueMutation = useMutation({
    mutationFn: async ({ bill, value }: { bill: RecurringBill; value: number }) => {
      const existingInstance = billInstances.find((instance) => instance.bill_id === bill.id) ?? null;

      if (existingInstance) {
        const { error } = await supabase
          .from("recurring_bills_instances")
          .update({ valor_ajustado: value })
          .eq("id", existingInstance.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_bills_instances").insert({
          user_id: user.id,
          bill_id: bill.id,
          month_reference: monthReference,
          valor_ajustado: value,
          pago: false,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Valor do mês atualizado" });
      invalidateQueries();
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao ajustar valor",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (!displayBills.length) {
      toast({
        title: "Sem dados para exportar",
        description: "Nenhuma conta cadastrada para o período selecionado.",
      });
      return;
    }

    const payload = buildCsv(displayBills.map((item) => ({ ...item, month: selectedMonth })));
    const blob = new Blob([payload], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `contas_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name || !formValues.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe nome e valor da conta.",
        variant: "destructive",
      });
      return;
    }

    if (editingBill) {
      updateBillMutation.mutate({ ...formValues, id: editingBill.id });
    } else {
      createBillMutation.mutate(formValues);
    }
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return `${String(month).padStart(2, "0")}/${year}`;
  }, [selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contas recorrentes</h1>
          <p className="text-sm text-slate-500">Controle o que precisa ser pago no mês {monthLabel}.</p>
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
          <Button variant="outline" onClick={handleExport}>
            Exportar CSV
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          >
            Nova conta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">Total do mês</p>
            <p className="text-xl font-semibold text-slate-700">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">Pago</p>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-slate-500">A pagar</p>
            <p className="text-xl font-semibold text-rose-600">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-left font-medium">Conta</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Banco</th>
                  <th className="px-4 py-3 text-right font-medium">Valor do mês</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingBills || isLoadingInstances ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Carregando contas...
                    </td>
                  </tr>
                ) : displayBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      Nenhuma conta cadastrada. Clique em &quot;Nova conta&quot; para começar.
                    </td>
                  </tr>
                ) : (
                  displayBills.map(({ bill, amount, isPaid }) => (
                    <tr key={bill.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        Dia {Number(bill.due_date).toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{bill.name}</td>
                      <td className="px-4 py-3 text-slate-500">{bill.category?.trim() || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {bill.bank ? formatBankName(bill.bank) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isPaid ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const value = Number(prompt("Novo valor para este mês:", String(amount)));
                              if (!Number.isFinite(value) || value <= 0) return;
                              adjustValueMutation.mutate({ bill, value });
                            }}
                          >
                            Ajustar mês
                          </Button>
                          <Button
                            size="sm"
                            variant={isPaid ? "outline" : "default"}
                            onClick={() => togglePaidMutation.mutate({ bill, isPaid: !isPaid })}
                          >
                            {isPaid ? "Desmarcar" : "Marcar pago"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBill(bill);
                              const trimmedCategory = bill.category?.trim() || "";
                              const formattedBank = formatBankName(bill.bank ?? "");
                              setCategoryMode(
                                trimmedCategory && categoryOptions.includes(trimmedCategory)
                                  ? "list"
                                  : "custom"
                              );
                              setBankMode(
                                formattedBank && bankOptions.includes(formattedBank)
                                  ? "list"
                                  : "custom"
                              );
                              setFormValues({
                                name: bill.name,
                                value: String(bill.value),
                                due_date: String(bill.due_date),
                                category: trimmedCategory,
                                bank: formattedBank,
                              });
                              setIsFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Remover esta conta recorrente?")) {
                                deleteBillMutation.mutate(bill.id);
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
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBill ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Nome</label>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Valor base</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formValues.value}
                onChange={(event) => setFormValues((prev) => ({ ...prev, value: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Dia do vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formValues.due_date}
                onChange={(event) => setFormValues((prev) => ({ ...prev, due_date: event.target.value }))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Categoria</label>
              <select
                value={
                  categoryMode === "list"
                    ? categoryOptions.includes(formValues.category)
                      ? formValues.category
                      : ""
                    : "__custom"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__custom") {
                    setCategoryMode("custom");
                    setFormValues((prev) => ({ ...prev, category: "" }));
                    return;
                  }
                  setCategoryMode("list");
                  setFormValues((prev) => ({ ...prev, category: value }));
                }}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="__custom">Outra...</option>
              </select>
              {categoryMode === "custom" && (
                <input
                  type="text"
                  value={formValues.category}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Informe a categoria"
                />
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-600">Banco/Conta</label>
              <select
                value={bankMode === "list" ? formValues.bank : "__custom"}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__custom") {
                    setBankMode("custom");
                    setFormValues((prev) => ({ ...prev, bank: "" }));
                    return;
                  }
                  setBankMode("list");
                  setFormValues((prev) => ({ ...prev, bank: value }));
                }}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {bankOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="__custom">Outro...</option>
              </select>
              {bankMode === "custom" && (
                <input
                  type="text"
                  value={formValues.bank}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, bank: event.target.value }))}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Informe o banco"
                />
              )}
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
              <Button type="submit" disabled={createBillMutation.isPending || updateBillMutation.isPending}>
                {editingBill ? "Salvar alterações" : "Adicionar conta"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contas;
