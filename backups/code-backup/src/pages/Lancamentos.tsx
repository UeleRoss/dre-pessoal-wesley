import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CATEGORIES } from "@/constants/categories";
import { getDefaultCategoriesForUnit } from "@/constants/default-categories";
import { CATEGORY_TO_BUSINESS_UNIT_MAP } from "@/types/business-unit";
import type { BusinessUnit } from "@/types/business-unit";
import type { LocalUser } from "@/services/auth-service";
import { offlineDb } from "@/services/offline-db";
import type { FinancialItem, UnitCategory } from "@/types/financial";
import type { BankBalance, Category } from "@/types/database";

const CATEGORY_TO_UNIT_LOWER = Object.fromEntries(
  Object.entries(CATEGORY_TO_BUSINESS_UNIT_MAP).map(([key, value]) => [key.toLowerCase(), value])
);

type FinancialItemFormValues = {
  date: string;
  type: "entrada" | "saida";
  description: string;
  amount: string;
  category: string;
  bank: string;
  isRecurring: boolean;
  isInstallment: boolean;
  totalInstallments: string;
  businessUnitId: string;
  installmentStartMonth: string;
  installmentEndMonth: string;
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
    if (hasSpecial) return token.toUpperCase();
    if (token.length <= 2) return token.toUpperCase();
    const lower = token.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return formattedTokens.join(" ");
};

const monthToDate = (month: string) => (month ? `${month}-01` : null);

const calculateEndMonth = (startMonth: string, totalInstallments: number) => {
  if (!startMonth || !Number.isFinite(totalInstallments) || totalInstallments <= 0) return "";
  const [yearStr, monthStr] = startMonth.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!year || Number.isNaN(monthIndex)) return "";
  const date = new Date(year, monthIndex, 1);
  date.setMonth(date.getMonth() + (totalInstallments - 1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (dateString?: string | null) => {
  if (!dateString) return "";
  const [year, month] = dateString.split("-");
  if (!year || !month) return "";
  return `${month.padStart(2, "0")}/${year}`;
};

const buildCsv = (items: FinancialItem[], businessUnitLookup: Record<string, BusinessUnit>) => {
  const headers = [
    "date",
    "type",
    "description",
    "amount",
    "category",
    "bank",
    "source",
    "is_recurring",
    "is_installment",
    "total_installments",
    "business_unit",
    "installment_start_month",
    "installment_end_month",
  ];
  const rows = items.map((item) => [
    item.date,
    normalizeType(item.type),
    `"${(item.description || "").replace(/"/g, '""')}"`,
    item.amount.toFixed(2),
    `"${(item.category || "").replace(/"/g, '""')}"`,
    `"${formatBankName(item.bank ?? "").replace(/"/g, '""')}"`,
    `"${(item.source || "").replace(/"/g, '""')}"`,
    item.is_recurring ? "true" : "false",
    item.is_installment ? "true" : "false",
    item.total_installments ?? "",
    `"${
      item.business_unit_id
        ? (businessUnitLookup[item.business_unit_id]?.name || "Sem unidade").replace(/"/g, '""')
        : "Sem unidade"
    }"`,
    item.installment_start_month ? item.installment_start_month.slice(0, 7) : "",
    item.installment_end_month ? item.installment_end_month.slice(0, 7) : "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};

const defaultFormValues = (
  initialDate: string,
  defaultMonth: string,
  defaultUnitId = ""
): FinancialItemFormValues => ({
  date: initialDate,
  type: "saida",
  description: "",
  amount: "",
  category: "",
  bank: "",
  isRecurring: false,
  isInstallment: false,
  totalInstallments: "",
  businessUnitId: defaultUnitId,
  installmentStartMonth: defaultMonth,
  installmentEndMonth: "",
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Tente novamente em instantes.";

const Lancamentos = ({ user }: { user: LocalUser }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [formValues, setFormValues] = useState<FinancialItemFormValues>(() => {
    const initialDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    return defaultFormValues(initialDate, initialMonth);
  });
  const [categoryMode, setCategoryMode] = useState<"list" | "custom">("list");
  const [bankMode, setBankMode] = useState<"list" | "custom">("list");
  const [hasEnsuredFilhos, setHasEnsuredFilhos] = useState(false);

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
      return offlineDb.fetchFinancialItems(user.id, startDate, endDate);
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", user.id],
    queryFn: async () => offlineDb.fetchCategories(user.id),
    enabled: !!user.id,
  });

  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ["business-units", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      return offlineDb.fetchBusinessUnits(user.id);
    },
    enabled: !!user.id,
  });

  const { data: unitCategories = [] } = useQuery<UnitCategory[]>({
    queryKey: ["unit-categories", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      return offlineDb.fetchUnitCategories(user.id);
    },
    enabled: !!user.id,
  });

  const { data: bankBalances = [] } = useQuery<BankBalance[]>({
    queryKey: ["bank-balances", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      return offlineDb.fetchBankBalances(user.id);
    },
    enabled: !!user.id,
  });

  const businessUnitById = useMemo(() => {
    return businessUnits.reduce<Record<string, BusinessUnit>>((acc, unit) => {
      acc[unit.id] = unit;
      return acc;
    }, {});
  }, [businessUnits]);

  const categoriesByUnitFromHistory = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    financialItems.forEach((item) => {
      const unitKey = item.business_unit_id ?? "none";
      const name = item.category?.trim();
      if (!name) return;
      const lower = name.toLowerCase();
      if (!map.has(unitKey)) {
        map.set(unitKey, new Map());
      }
      const bucket = map.get(unitKey)!;
      if (!bucket.has(lower)) {
        bucket.set(lower, name);
      }
    });
    return map;
  }, [financialItems]);

  const categoryMatchesUnit = useCallback(
    (name: string, type: "entrada" | "saida", unitId: string) => {
      if (!unitId) return true;
      const unitName = businessUnitById[unitId]?.name;
      if (!unitName) return false;
      const trimmed = name.trim();
      if (!trimmed) return false;
      const lower = trimmed.toLowerCase();

      const mappedConstant = CATEGORY_TO_UNIT_LOWER[lower];
      if (mappedConstant) {
        return mappedConstant === unitName;
      }

      const defaults = getDefaultCategoriesForUnit(type, unitName).map((category) =>
        category.toLowerCase()
      );
      if (defaults.includes(lower)) {
        return true;
      }

      if (
        unitCategories.some(
          (category) =>
            category.business_unit_id === unitId &&
            category.type === type &&
            (category.name?.trim().toLowerCase() ?? "") === lower
        )
      ) {
        return true;
      }

      if (categoriesByUnitFromHistory.get(unitId)?.has(lower)) {
        return true;
      }

      return false;
    },
    [businessUnitById, categoriesByUnitFromHistory, unitCategories]
  );

  const computeCategoryOptions = useCallback(
    (type: "entrada" | "saida", businessUnitId: string) => {
      const optionMap = new Map<string, string>();
      const addOption = (value: string | null | undefined) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!optionMap.has(key)) {
          optionMap.set(key, trimmed);
        }
      };

      const allowGeneral = !businessUnitId;
      const unitName = businessUnitId ? businessUnitById[businessUnitId]?.name : undefined;

      if (allowGeneral) {
        categories.forEach((category) => addOption(category.name));
      } else {
        categories.forEach((category) => {
          const name = category.name;
          if (!name) return;
          if (categoryMatchesUnit(name, type, businessUnitId)) {
            addOption(name);
          }
        });
      }

      if (businessUnitId) {
        categoriesByUnitFromHistory.get(businessUnitId)?.forEach((original) => addOption(original));
      } else {
        categoriesByUnitFromHistory.get("none")?.forEach((original) => addOption(original));
      }

      unitCategories
        .filter((category) => {
          if (category.type !== type) return false;
          if (!businessUnitId) return true;
          return category.business_unit_id === businessUnitId;
        })
        .forEach((category) => addOption(category.name));

      if (businessUnitId && unitName) {
        getDefaultCategoriesForUnit(type, unitName).forEach((category) => addOption(category));
      } else {
        DEFAULT_CATEGORIES.forEach((category) => addOption(category));
      }

      return Array.from(optionMap.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    [
      categories,
      categoryMatchesUnit,
      categoriesByUnitFromHistory,
      unitCategories,
      businessUnitById,
    ]
  );

  const categoryOptions = useMemo(() => {
    const options = computeCategoryOptions(formValues.type, formValues.businessUnitId);
    return options.length ? options : computeCategoryOptions(formValues.type, "");
  }, [computeCategoryOptions, formValues.businessUnitId, formValues.type]);

  const bankOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    const addBank = (value: string | null | undefined) => {
      if (!value) return;
      const formatted = formatBankName(value);
      if (!formatted) return;
      const key = formatted.toLowerCase();
      if (!optionMap.has(key)) {
        optionMap.set(key, formatted);
      }
    };
    bankBalances.forEach((bank) => addBank(bank.bank_name));
    financialItems.forEach((item) => addBank(item.bank));
    return Array.from(optionMap.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [bankBalances, financialItems]);

  const { unitSummaries, summaryById } = useMemo(() => {
    type Summary = { id: string; name: string; entradas: number; saidas: number; saldo: number };
    const summaryMap = new Map<string, Summary>();

    const ensure = (id: string, name: string) => {
      if (!summaryMap.has(id)) {
        summaryMap.set(id, { id, name, entradas: 0, saidas: 0, saldo: 0 });
      }
      return summaryMap.get(id)!;
    };

    ensure("all", "Todos");
    businessUnits.forEach((unit) => ensure(unit.id, unit.name));
    ensure("none", "Sem unidade");

    financialItems.forEach((item) => {
      const amount = Number(item.amount) || 0;
      const type = normalizeType(item.type);
      const unitId = item.business_unit_id ?? "none";

      const global = ensure("all", "Todos");
      if (type === "entrada") {
        global.entradas += amount;
      } else {
        global.saidas += amount;
      }

      const unitSummary = ensure(unitId, unitId === "none" ? "Sem unidade" : businessUnitById[unitId]?.name || "Sem unidade");
      if (type === "entrada") {
        unitSummary.entradas += amount;
      } else {
        unitSummary.saidas += amount;
      }
    });

    summaryMap.forEach((summary) => {
      summary.saldo = summary.entradas - summary.saidas;
    });

    const list = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.id === "all") return -1;
      if (b.id === "all") return 1;
      if (a.id === "none") return 1;
      if (b.id === "none") return -1;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    const mapWithSaldo = new Map<string, Summary>();
    list.forEach((summary) => mapWithSaldo.set(summary.id, summary));

    return { unitSummaries: list, summaryById: mapWithSaldo };
  }, [businessUnits, businessUnitById, financialItems]);

  const filteredItems = useMemo(() => {
    if (selectedUnitId === "all") {
      return financialItems;
    }
    if (selectedUnitId === "none") {
      return financialItems.filter((item) => !item.business_unit_id);
    }
    return financialItems.filter((item) => item.business_unit_id === selectedUnitId);
  }, [financialItems, selectedUnitId]);

  const selectedSummary = summaryById.get(selectedUnitId) ?? summaryById.get("all") ?? {
    id: "all",
    name: "Todos",
    entradas: 0,
    saidas: 0,
    saldo: 0,
  };

  useEffect(() => {
    if (summaryById.size === 0) return;
    if (!summaryById.has(selectedUnitId)) {
      const fallback = summaryById.has("all")
        ? "all"
        : summaryById.keys().next().value ?? "all";
      if (fallback !== selectedUnitId) {
        setSelectedUnitId(fallback);
      }
    }
  }, [summaryById, selectedUnitId]);

  useEffect(() => {
    if (!user.id || hasEnsuredFilhos) return;

    const filhosExists = businessUnits.some((unit) => unit.name === "Filhos");
    if (filhosExists) {
      setHasEnsuredFilhos(true);
      return;
    }

    const ensureFilhosUnit = async () => {
      setHasEnsuredFilhos(true);
      try {
        await offlineDb.ensureBusinessUnit(user.id, {
          name: "Filhos",
          color: "#f97316",
          icon: "baby",
        });
        queryClient.invalidateQueries({ queryKey: ["business-units", user.id] });
      } catch (error) {
        console.error("Erro ao criar unidade 'Filhos':", error);
        setHasEnsuredFilhos(false);
      }
    };

    void ensureFilhosUnit();
  }, [businessUnits, hasEnsuredFilhos, queryClient, user.id]);

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

  useEffect(() => {
    setFormValues((prev) => {
      if (!prev.isInstallment) return prev;

      const total = Number(prev.totalInstallments);
      if (!prev.installmentStartMonth || !Number.isFinite(total) || total <= 0) {
        return prev;
      }

      const expectedEnd = calculateEndMonth(prev.installmentStartMonth, total);
      if (!expectedEnd) return prev;

      if (!prev.installmentEndMonth || prev.installmentEndMonth === expectedEnd) {
        if (prev.installmentEndMonth === expectedEnd) return prev;
        return { ...prev, installmentEndMonth: expectedEnd };
      }

      return prev;
    });
  }, [formValues.isInstallment, formValues.installmentStartMonth, formValues.totalInstallments]);

  const resetForm = useCallback(
    (unitId = selectedUnitId) => {
      const [year, month] = selectedMonth.split("-");
      const initialDate = `${year}-${month}-${String(new Date().getDate()).padStart(2, "0")}`;
      const normalizedUnitId = unitId === "all" || unitId === "none" ? "" : unitId;
      const options = computeCategoryOptions("saida", normalizedUnitId);
      const defaults = defaultFormValues(initialDate, selectedMonth, normalizedUnitId);
      defaults.category = options[0] ?? "";
      setFormValues(defaults);
      setEditingItem(null);
      setCategoryMode(options.length ? "list" : "custom");
      setBankMode("list");
    },
    [computeCategoryOptions, selectedMonth, selectedUnitId]
  );

  const resolveInstallmentDetails = (values: FinancialItemFormValues) => {
    if (!values.isInstallment) {
      return {
        total: null as number | null,
        start: null as string | null,
        end: null as string | null,
      };
    }

    const totalInstallments = Number(values.totalInstallments);
    const hasValidTotal = Number.isFinite(totalInstallments) && totalInstallments > 0;
    const startMonth = values.installmentStartMonth || values.date.slice(0, 7);
    const resolvedEndMonth =
      values.installmentEndMonth ||
      (hasValidTotal ? calculateEndMonth(startMonth, totalInstallments) : "");

    return {
      total: hasValidTotal ? totalInstallments : null,
      start: monthToDate(startMonth),
      end: resolvedEndMonth ? monthToDate(resolvedEndMonth) : null,
    };
  };

  const handleBusinessUnitChange = (newUnitId: string) => {
    setCategoryMode("list");
    setFormValues((prev) => {
      const options = computeCategoryOptions(prev.type, newUnitId);
      const updated: FinancialItemFormValues = {
        ...prev,
        businessUnitId: newUnitId,
        category: options.length ? (options.includes(prev.category) ? prev.category : options[0]) : "",
      };
      if (!options.length) {
        setCategoryMode("custom");
      }
      return updated;
    });
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === "__custom") {
      setCategoryMode("custom");
      setFormValues((prev) => ({ ...prev, category: "" }));
      return;
    }

    setCategoryMode("list");
    setFormValues((prev) => {
      const updated: FinancialItemFormValues = {
        ...prev,
        category: value,
      };

      if (!prev.businessUnitId) {
        const mappedUnitName = CATEGORY_TO_UNIT_LOWER[value.toLowerCase()];
        if (mappedUnitName) {
          const mappedUnit = businessUnits.find((unit) => unit.name === mappedUnitName);
          if (mappedUnit) {
            updated.businessUnitId = mappedUnit.id;
          }
        }
      }

      return updated;
    });
  };

  const handleBankSelectChange = (value: string) => {
    if (value === "__custom") {
      setBankMode("custom");
      setFormValues((prev) => ({ ...prev, bank: "" }));
      return;
    }

    setBankMode("list");
    setFormValues((prev) => ({ ...prev, bank: value }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: FinancialItemFormValues) => {
      const amount = parseFloat(payload.amount.replace(",", "."));
      const sanitizedAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
      const sanitizedCategory = payload.category.trim();
      const sanitizedBank = formatBankName(payload.bank);
      const { total, start, end } = resolveInstallmentDetails(payload);

      await offlineDb.insertFinancialItems(user.id, [
        {
          date: payload.date,
          type: payload.type,
          description: payload.description.trim(),
          amount: sanitizedAmount,
          category: sanitizedCategory || null,
          bank: sanitizedBank || null,
          source: "manual",
          is_recurring: payload.isRecurring,
          is_installment: payload.isInstallment,
          total_installments: total,
          business_unit_id: payload.businessUnitId || null,
          installment_start_month: start,
          installment_end_month: end,
        },
      ]);
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
      const sanitizedCategory = payload.category.trim();
      const sanitizedBank = formatBankName(payload.bank);
      const { total, start, end } = resolveInstallmentDetails(payload);

      await offlineDb.updateFinancialItem(user.id, payload.id, {
        date: payload.date,
        type: payload.type,
        description: payload.description.trim(),
        amount: sanitizedAmount,
        category: sanitizedCategory || null,
        bank: sanitizedBank || null,
        is_recurring: payload.isRecurring,
        is_installment: payload.isInstallment,
        total_installments: total,
        business_unit_id: payload.businessUnitId || null,
        installment_start_month: start,
        installment_end_month: end,
      });
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
      await offlineDb.deleteFinancialItem(user.id, id);
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
    if (!formValues.description.trim() || !formValues.amount) {
      toast({
        title: "Dados incompletos",
        description: "Descrição e valor são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!formValues.category.trim()) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione ou informe uma categoria.",
        variant: "destructive",
      });
      return;
    }

    const submissionValues: FinancialItemFormValues = {
      ...formValues,
      installmentStartMonth: formValues.isInstallment
        ? formValues.installmentStartMonth || formValues.date.slice(0, 7)
        : "",
      installmentEndMonth: formValues.isInstallment
        ? formValues.installmentEndMonth ||
          (formValues.installmentStartMonth && Number(formValues.totalInstallments)
            ? calculateEndMonth(
                formValues.installmentStartMonth || formValues.date.slice(0, 7),
                Number(formValues.totalInstallments)
              )
            : "")
        : "",
      totalInstallments: formValues.isInstallment ? formValues.totalInstallments : "",
    };

    if (editingItem) {
      updateMutation.mutate({ ...submissionValues, id: editingItem.id });
    } else {
      createMutation.mutate(submissionValues);
    }
  };

  const handleEdit = (item: FinancialItem) => {
    setEditingItem(item);
    const normalizedType = normalizeType(item.type);
    const unitId = item.business_unit_id ?? "";
    const optionsForItem = computeCategoryOptions(normalizedType, unitId);
    const trimmedCategory = item.category?.trim() || "";
    const categoryIsCustom = trimmedCategory ? !optionsForItem.includes(trimmedCategory) : false;
    const formattedBank = formatBankName(item.bank ?? "");
    const bankIsCustom = formattedBank ? !bankOptions.includes(formattedBank) : false;

    setCategoryMode(categoryIsCustom ? "custom" : "list");
    setBankMode(bankIsCustom ? "custom" : "list");

    setFormValues({
      date: item.date,
      type: normalizedType,
      description: item.description ?? "",
      amount: String(item.amount),
      category: trimmedCategory,
      bank: formattedBank,
      isRecurring: Boolean(item.is_recurring),
      isInstallment: Boolean(item.is_installment),
      totalInstallments: item.total_installments ? String(item.total_installments) : "",
      businessUnitId: unitId,
      installmentStartMonth: item.installment_start_month
        ? item.installment_start_month.slice(0, 7)
        : item.date.slice(0, 7),
      installmentEndMonth: item.installment_end_month ? item.installment_end_month.slice(0, 7) : "",
    });
    setIsFormOpen(true);
  };

  const handleExportCsv = () => {
    if (!filteredItems.length) {
      toast({
        title: "Sem dados para exportar",
        description: "Nenhum lançamento encontrado no período selecionado.",
      });
      return;
    }

    const csv = buildCsv(filteredItems, businessUnitById);
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
              className="ml-2 rounded-full border border-slate-300 px-3 py-1 text-sm"
            />
          </label>
          <Button variant="outline" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
          <Button
            onClick={() => {
              resetForm(selectedUnitId);
              setIsFormOpen(true);
            }}
          >
            Novo lançamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {unitSummaries.map((summary) => {
          const isSelected = summary.id === selectedUnitId;
          return (
            <button
              key={summary.id}
              type="button"
              onClick={() => setSelectedUnitId(summary.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {summary.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-slate-400">Entradas</p>
            <p className="text-xl font-semibold text-slate-700">{formatCurrency(selectedSummary.entradas)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-slate-400">Saídas</p>
            <p className="text-xl font-semibold text-slate-700">{formatCurrency(selectedSummary.saidas)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-slate-400">Saldo</p>
            <p className="text-xl font-semibold text-slate-700">{formatCurrency(selectedSummary.saldo)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Carregando lançamentos...
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Nenhum lançamento encontrado para {periodLabel}.
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const typeLabel = normalizeType(item.type);
            const isIncome = typeLabel === "entrada";
            const amountValue = Number(item.amount);
            const displayAmount = `${isIncome ? "" : "-"}${formatCurrency(amountValue)}`;
            const amountColor = isIncome ? "text-emerald-600" : "text-rose-600";
            const circleColor = isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600";
            const initialSource = item.category || item.description || "—";
            const initial = initialSource.trim().charAt(0).toUpperCase() || "–";
            const recurringLabel = item.is_recurring ? "Recorrente" : "";
            const installmentLabel = item.is_installment
              ? `Parcela${item.total_installments ? ` (${item.total_installments})` : ""}`
              : "";
            const scheduleLabel =
              item.is_installment &&
              (item.installment_start_month || item.installment_end_month) &&
              [formatMonthLabel(item.installment_start_month), formatMonthLabel(item.installment_end_month)]
                .filter(Boolean)
                .join(" → ");

            return (
              <Card key={`${item.id}-list`} className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-full ${circleColor} text-sm font-semibold`}>
                    {initial}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-semibold text-slate-800">{item.description}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.date).toLocaleDateString("pt-BR")} · {item.category || "Sem categoria"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.business_unit_id
                        ? businessUnitById[item.business_unit_id]?.name || "Sem unidade"
                        : "Sem unidade"}
                      {item.bank ? ` · ${formatBankName(item.bank)}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {recurringLabel && <span>{recurringLabel}</span>}
                      {item.is_recurring && item.is_installment && <span>·</span>}
                      {installmentLabel && <span>{installmentLabel}</span>}
                      {scheduleLabel && (
                        <>
                          {(item.is_recurring || item.is_installment) && <span>·</span>}
                          <span>{scheduleLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-base font-semibold ${amountColor}`}>{displayAmount}</span>
                    <div className="flex gap-1 text-xs">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-700"
                        onClick={() => {
                          if (confirm("Remover este lançamento?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
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
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipo"
                    value="entrada"
                    checked={formValues.type === "entrada"}
                    onChange={() => setFormValues((prev) => ({ ...prev, type: "entrada" }))}
                  />
                  Entrada
                </label>
                <label className="flex items-center gap-2">
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
              <label className="text-sm font-medium text-slate-600">Unidade</label>
              <select
                value={formValues.businessUnitId}
                onChange={(event) => {
                  setCategoryMode("list");
                  handleBusinessUnitChange(event.target.value);
                }}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
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
                onChange={(event) => handleCategorySelectChange(event.target.value)}
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
                onChange={(event) => handleBankSelectChange(event.target.value)}
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
            <div className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">Etiquetas</span>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formValues.isRecurring}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, isRecurring: event.target.checked }))
                    }
                  />
                  Recorrente
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formValues.isInstallment}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setFormValues((prev) => ({
                        ...prev,
                        isInstallment: checked,
                        totalInstallments: checked ? prev.totalInstallments : "",
                        installmentStartMonth: checked
                          ? prev.installmentStartMonth || prev.date.slice(0, 7)
                          : "",
                        installmentEndMonth: checked ? prev.installmentEndMonth : "",
                      }));
                    }}
                  />
                  Parcela
                </label>
              </div>
              {formValues.isInstallment && (
                <div className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <label className="text-xs text-slate-500">Mês inicial</label>
                      <input
                        type="month"
                        value={formValues.installmentStartMonth}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            installmentStartMonth: event.target.value,
                          }))
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs text-slate-500">Mês final</label>
                      <input
                        type="month"
                        value={formValues.installmentEndMonth}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            installmentEndMonth: event.target.value,
                          }))
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <label className="text-xs text-slate-500">
                    Total de parcelas (opcional, somente informativo)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formValues.totalInstallments}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, totalInstallments: event.target.value }))
                    }
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Ex.: 6"
                  />
                </div>
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
