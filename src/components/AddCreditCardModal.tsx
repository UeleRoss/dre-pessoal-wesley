import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Wallet, BadgeDollarSign } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useToast } from "@/hooks/use-toast";
import type { CreditCard as CreditCardType } from "@/types/financial";

interface AddCreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  mode?: "create" | "edit";
  card?: CreditCardType | null;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const defaultFormState = {
  name: '',
  due_day: '10',
  closing_day: '5',
  credit_limit: '',
  color: '#3b82f6',
  card_type: 'credit' as 'prepaid' | 'credit',
};

const AddCreditCardModal = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  mode = "create",
  card = null,
}: AddCreditCardModalProps) => {
  const { toast } = useToast();
  const { addCard, updateCard, deactivateCard } = useCreditCards(userId);

  const [formData, setFormData] = useState(() => ({ ...defaultFormState }));
  const isEditMode = mode === "edit" && !!card;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (isEditMode && card) {
      setFormData({
        name: card.name || '',
        due_day: String(card.due_day ?? defaultFormState.due_day),
        closing_day: String(card.closing_day ?? defaultFormState.closing_day),
        credit_limit: card.credit_limit != null ? String(card.credit_limit) : '',
        color: card.color || defaultFormState.color,
        card_type: card.card_type || defaultFormState.card_type,
      });
    } else {
      setFormData({ ...defaultFormState });
    }
  }, [isOpen, isEditMode, card]);

  const isSaving = isEditMode ? updateCard.isPending : addCard.isPending;
  const isDeleting = deactivateCard.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome do cartão",
        variant: "destructive",
      });
      return;
    }

    const dueDay = parseInt(formData.due_day, 10);
    const closingDay = parseInt(formData.closing_day, 10);

    if (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      toast({
        title: "Erro",
        description: "Dia de vencimento deve estar entre 1 e 31",
        variant: "destructive",
      });
      return;
    }

    if (Number.isNaN(closingDay) || closingDay < 1 || closingDay > 31) {
      toast({
        title: "Erro",
        description: "Dia de fechamento deve estar entre 1 e 31",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && card) {
        await updateCard.mutateAsync({
          id: card.id,
          updates: {
            name: formData.name.trim(),
            due_day: dueDay,
            closing_day: closingDay,
            credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
            color: formData.color,
            card_type: formData.card_type,
          }
        });
      } else {
        await addCard.mutateAsync({
          name: formData.name.trim(),
          due_day: dueDay,
          closing_day: closingDay,
          credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
          color: formData.color,
          card_type: formData.card_type,
        });
      }

      setFormData({ ...defaultFormState });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !card) {
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja excluir o cartão "${card.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deactivateCard.mutateAsync(card.id);
      setFormData({ ...defaultFormState });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {isEditMode ? 'Editar Cartão de Crédito' : 'Adicionar Cartão de Crédito'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize as informações do cartão ou remova-o caso não utilize mais.'
              : 'Cadastre os dados do cartão para controlar as faturas e vincular seus lançamentos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="card-name">Nome do Cartão *</Label>
            <Input
              id="card-name"
              placeholder="Ex: Nubank Ultravioleta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSaving || isDeleting}
              required
            />
          </div>

          <div>
            <Label>Tipo de Cartão *</Label>
            <RadioGroup
              value={formData.card_type}
              onValueChange={(value: 'prepaid' | 'credit') => setFormData({ ...formData, card_type: value })}
              className="grid grid-cols-2 gap-4 mt-2"
              disabled={isSaving || isDeleting}
            >
              <div className="relative">
                <RadioGroupItem
                  value="credit"
                  id="card-type-credit"
                  className="peer sr-only"
                  disabled={isSaving || isDeleting}
                />
                <Label
                  htmlFor="card-type-credit"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                >
                  <BadgeDollarSign className="h-6 w-6 text-gray-700 peer-data-[state=checked]:text-blue-700" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Crédito</div>
                    <div className="text-xs text-gray-600 mt-1">Paga na fatura seguinte</div>
                  </div>
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem
                  value="prepaid"
                  id="card-type-prepaid"
                  className="peer sr-only"
                  disabled={isSaving || isDeleting}
                />
                <Label
                  htmlFor="card-type-prepaid"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 cursor-pointer transition-all"
                >
                  <Wallet className="h-6 w-6 text-gray-700 peer-data-[state=checked]:text-green-700" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Pré-pago</div>
                    <div className="text-xs text-gray-600 mt-1">Desconta na hora</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due-day">Dia Vencimento *</Label>
              <Input
                id="due-day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                disabled={isSaving || isDeleting}
                required
              />
            </div>
            <div>
              <Label htmlFor="closing-day">Dia Fechamento *</Label>
              <Input
                id="closing-day"
                type="number"
                min="1"
                max="31"
                value={formData.closing_day}
                onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                disabled={isSaving || isDeleting}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="credit-limit">Limite de Crédito (opcional)</Label>
            <Input
              id="credit-limit"
              type="number"
              step="0.01"
              placeholder="R$ 5000.00"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              disabled={isSaving || isDeleting}
            />
          </div>

          <div>
            <Label>Cor do Cartão</Label>
            <div className="flex gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  disabled={isSaving || isDeleting}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Cartão'}
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || isDeleting}>
                {isSaving ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Salvar Cartão'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditCardModal;
