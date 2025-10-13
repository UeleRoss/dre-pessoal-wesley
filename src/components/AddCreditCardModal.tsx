import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useToast } from "@/hooks/use-toast";

interface AddCreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
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

const AddCreditCardModal = ({ isOpen, onClose, onSuccess, userId }: AddCreditCardModalProps) => {
  const { toast } = useToast();
  const { addCard } = useCreditCards(userId);

  const [formData, setFormData] = useState({
    name: '',
    due_day: 10,
    closing_day: 5,
    credit_limit: '',
    color: '#3b82f6',
  });

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

    if (formData.due_day < 1 || formData.due_day > 31) {
      toast({
        title: "Erro",
        description: "Dia de vencimento deve estar entre 1 e 31",
        variant: "destructive",
      });
      return;
    }

    if (formData.closing_day < 1 || formData.closing_day > 31) {
      toast({
        title: "Erro",
        description: "Dia de fechamento deve estar entre 1 e 31",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCard.mutateAsync({
        name: formData.name.trim(),
        due_day: formData.due_day,
        closing_day: formData.closing_day,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        color: formData.color,
      });

      toast({
        title: "Cartão adicionado!",
        description: `${formData.name} foi cadastrado com sucesso`,
      });

      // Reset form
      setFormData({
        name: '',
        due_day: 10,
        closing_day: 5,
        credit_limit: '',
        color: '#3b82f6',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar cartão",
        description: error.message || "Ocorreu um erro ao cadastrar o cartão",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Cartão de Crédito
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Cartão */}
          <div>
            <Label htmlFor="card-name">Nome do Cartão *</Label>
            <Input
              id="card-name"
              placeholder="Ex: Nubank Ultravioleta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Dias de Vencimento e Fechamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due-day">Dia Vencimento *</Label>
              <Input
                id="due-day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, closing_day: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Limite de Crédito (opcional) */}
          <div>
            <Label htmlFor="credit-limit">Limite de Crédito (opcional)</Label>
            <Input
              id="credit-limit"
              type="number"
              step="0.01"
              placeholder="R$ 5000.00"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
            />
          </div>

          {/* Cor do Cartão */}
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
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addCard.isPending}>
              {addCard.isPending ? 'Salvando...' : 'Salvar Cartão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditCardModal;
