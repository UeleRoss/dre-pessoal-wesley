import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface WelcomeStepProps {
  displayName: string;
  onNameChange: (name: string) => void;
}

const WelcomeStep = ({ displayName, onNameChange }: WelcomeStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Bem-vindo ao DRE Pessoal!
        </h1>
        <p className="text-navy-600 text-lg">
          Vamos personalizar sua experiência em poucos passos
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-base font-medium">
            Como você gostaria de ser chamado(a)?
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Digite seu nome"
            value={displayName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-lg h-12"
            autoFocus
          />
          <p className="text-sm text-navy-500">
            Este nome será exibido no cabeçalho do sistema
          </p>
        </div>

        {displayName && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg animate-fade-in">
            <p className="text-navy-700">
              <span className="font-semibold">Visualização:</span> DRE Pessoal da{" "}
              <span className="font-bold text-orange-600">{displayName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeStep;
