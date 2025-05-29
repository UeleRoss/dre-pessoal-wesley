
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FinancialItem {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bank: string;
  date: string;
}

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: FinancialItem | null;
  userId: string;
}

const EditEntryModal = ({ isOpen, onClose, onSuccess, item, userId }: EditEntryModalProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [bank, setBank] = useState("");
  const [date, setDate] = useState("");
  const [banks, setBanks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setDescription(item.description);
      setAmount(item.amount.toString());
      setType(item.type);
      setCategory(item.category);
      setBank(item.bank);
      setDate(item.date);
    }
  }, [item]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchBanksAndCategories();
    }
  }, [isOpen, userId]);

  const fetchBanksAndCategories = async () => {
    const { data, error } = await supabase
      .from('financial_items')
      .select('bank, category')
      .eq('user_id', userId);

    if (!error && data) {
      setBanks([...new Set(data.map(item => item.bank))]);
      setCategories([...new Set(data.map(item => item.category))]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;

    const { error } = await supabase
      .from('financial_items')
      .update({
        description,
        amount: parseFloat(amount),
        type,
        category,
        bank,
        date,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao editar lançamento",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Lançamento editado com sucesso",
      });
      onSuccess();
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("");
    setCategory("");
    setBank("");
    setDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bank">Banco</Label>
            <Select value={bank} onValueChange={setBank} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEntryModal;
