import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BankBalanceRow = Database["public"]["Tables"]["bank_balances"]["Row"];

interface BankBalancesManagerProps {
  bankBalances: BankBalanceRow[];
  userBanks: string[];
  onSave: (updates: BankBalanceUpdatePayload[]) => Promise<void>;
  isSaving: boolean;
}

interface BankBalanceFormEntry {
  id?: string;
  initialBalance: string;
  baselineDate: string;
  hasExisting: boolean;
}

interface BankBalanceUpdatePayload {
  id?: string;
  bankName: string;
  initialBalance: number;
  baselineDate: string;
}

const DEFAULT_BANKS = ['C6 BANK', 'CONTA SIMPLES', 'ASAAS', 'NOMAD', 'NUBANK'];

const getToday = () => new Date().toISOString().split('T')[0];

const BankBalancesManager = ({
  bankBalances,
  userBanks,
  onSave,
  isSaving
}: BankBalancesManagerProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const availableBanks = useMemo(() => {
    const normalizedBanks = new Map<string, string>();

    DEFAULT_BANKS.forEach((bank) => {
      const key = bank.trim().toUpperCase();
      if (key) {
        normalizedBanks.set(key, key);
      }
    });

    userBanks
      .filter(Boolean)
      .map((bank) => bank.trim().toUpperCase())
      .filter((bank) => bank && bank !== 'NONE')
      .forEach((bank) => normalizedBanks.set(bank, bank));

    bankBalances
      .map((balance) => balance.bank_name.trim().toUpperCase())
      .filter(Boolean)
      .forEach((bank) => normalizedBanks.set(bank, bank));

    return Array.from(normalizedBanks.values()).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }, [bankBalances, userBanks]);

  const [formState, setFormState] = useState<Record<string, BankBalanceFormEntry>>({});

  useEffect(() => {
    const today = getToday();
    setFormState((previous) => {
      const nextState: Record<string, BankBalanceFormEntry> = {};

      availableBanks.forEach((bank) => {
        const existing = bankBalances.find(
          (balance) => balance.bank_name.trim().toUpperCase() === bank
        );

        const previousEntry = previous[bank];

        nextState[bank] = {
          id: existing?.id,
          initialBalance: existing
            ? String(existing.initial_balance ?? 0)
            : previousEntry?.initialBalance ?? "",
          baselineDate: existing
            ? existing.baseline_date
            : previousEntry?.baselineDate ?? today,
          hasExisting: !!existing,
        };
      });

      return nextState;
    });
  }, [availableBanks, bankBalances]);

  const handleBalanceChange = (bank: string, value: string) => {
    setFormState((state) => ({
      ...state,
      [bank]: {
        ...state[bank],
        initialBalance: value,
      },
    }));
  };

  const handleDateChange = (bank: string, value: string) => {
    setFormState((state) => ({
      ...state,
      [bank]: {
        ...state[bank],
        baselineDate: value,
      },
    }));
  };

  const handleSave = async () => {
    const updates: BankBalanceUpdatePayload[] = [];
    const errors: string[] = [];

    Object.entries(formState).forEach(([bank, entry]) => {
      const trimmedValue = (entry.initialBalance || "").trim();
      if (trimmedValue === "") {
        return;
      }

      const parsedValue = Number(trimmedValue.replace(',', '.'));

      if (Number.isNaN(parsedValue)) {
        errors.push(`Saldo inválido para ${bank}`);
        return;
      }

      if (!entry.baselineDate) {
        errors.push(`Data de referência obrigatória para ${bank}`);
        return;
      }

      updates.push({
        id: entry.id,
        bankName: bank,
        initialBalance: parsedValue,
        baselineDate: entry.baselineDate,
      });
    });

    if (errors.length > 0) {
      toast({
        title: "Não foi possível salvar os saldos",
        description: errors.join("\n"),
        variant: "destructive",
      });
      return;
    }

    if (updates.length === 0) {
      toast({
        title: "Preencha ao menos um saldo",
        description: "Informe o valor atual e a data de referência do banco que deseja controlar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSave(updates);
      toast({
        title: "Saldos atualizados",
        description: "Os valores base foram salvos com sucesso.",
      });
      setIsExpanded(false); // Colapsa após salvar
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao salvar.";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-navy-100">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Controle de Saldos por Banco</CardTitle>
            <CardDescription>
              Informe o saldo real de cada banco e a data de referência. A partir dessa data, o sistema soma os lançamentos
              futuros para projetar o saldo atual.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expandir
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6">
        <div className="grid gap-4">
          {availableBanks.map((bank) => {
            const entry = formState[bank];
            if (!entry) return null;

            return (
              <div
                key={bank}
                className="grid gap-3 rounded-lg border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-3 md:items-end md:gap-6"
              >
                <div>
                  <Label className="text-xs uppercase text-navy-500">{bank}</Label>
                  <Label htmlFor={`${bank}-balance`} className="mt-2 block text-sm font-medium text-navy-800">
                    Saldo base
                  </Label>
                  <Input
                    id={`${bank}-balance`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0,00"
                    value={entry.initialBalance}
                    onChange={(event) => handleBalanceChange(bank, event.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor={`${bank}-date`} className="block text-sm font-medium text-navy-800">
                    Data de referência
                  </Label>
                  <Input
                    id={`${bank}-date`}
                    type="date"
                    max={getToday()}
                    value={entry.baselineDate}
                    onChange={(event) => handleDateChange(bank, event.target.value)}
                  />
                </div>

                <div className="text-sm text-navy-500 md:text-right">
                  {entry.hasExisting ? (
                    <p>Saldo base já registrado. Atualize para reiniciar o controle.</p>
                  ) : (
                    <p>Defina um saldo inicial para começar a acompanhar este banco.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar saldos"}
          </Button>
        </div>
      </CardContent>
      )}
    </Card>
  );
};

export default BankBalancesManager;
