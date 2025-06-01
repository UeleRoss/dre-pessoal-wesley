
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface CreditCardChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingCharge?: any;
}

const CreditCardChargeModal = ({ isOpen, onClose, onSubmit, editingCharge }: CreditCardChargeModalProps) => {
  const [formData, setFormData] = useState({
    description: '',
    card: '',
    value: '',
    type: '',
    parcelas: '',
    observacao: ''
  });

  useEffect(() => {
    if (editingCharge) {
      setFormData({
        description: editingCharge.description || '',
        card: editingCharge.card || '',
        value: editingCharge.value?.toString() || '',
        type: editingCharge.type || '',
        parcelas: editingCharge.parcelas?.toString() || '',
        observacao: editingCharge.observacao || ''
      });
    } else {
      setFormData({
        description: '',
        card: '',
        value: '',
        type: '',
        parcelas: '',
        observacao: ''
      });
    }
  }, [editingCharge, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.card || !formData.value || !formData.type) {
      return;
    }

    const submitData = {
      ...formData,
      parcelas: formData.type === 'parcelado' && formData.parcelas ? parseInt(formData.parcelas) : null
    };

    onSubmit(submitData);
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCharge ? 'Editar Cobrança' : 'Nova Cobrança do Cartão'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ex: Netflix, Spotify, etc."
              required
            />
          </div>

          <div>
            <Label htmlFor="card">Cartão</Label>
            <Select
              value={formData.card}
              onValueChange={(value) => handleChange('card', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C6 Pessoal">C6 Pessoal</SelectItem>
                <SelectItem value="Conta Simples Empresa">Conta Simples Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="value">Valor</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recorrente">Recorrente</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'parcelado' && (
            <div>
              <Label htmlFor="parcelas">Número de Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                value={formData.parcelas}
                onChange={(e) => handleChange('parcelas', e.target.value)}
                placeholder="Ex: 12"
              />
            </div>
          )}

          <div>
            <Label htmlFor="observacao">Observação (Opcional)</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => handleChange('observacao', e.target.value)}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingCharge ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreditCardChargeModal;
