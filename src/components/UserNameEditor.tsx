
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserNameEditorProps {
  currentName: string;
  onNameChange: (newName: string) => void;
}

const UserNameEditor = ({ currentName, onNameChange }: UserNameEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const { toast } = useToast();

  const handleSave = () => {
    if (name.trim()) {
      onNameChange(name.trim());
      setIsOpen(false);
      toast({
        title: "Nome atualizado",
        description: "Seu nome foi atualizado com sucesso!",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1 text-navy-200 hover:text-white">
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Nome</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Seu nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserNameEditor;
