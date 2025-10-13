import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitsStepProps {
  selectedUnits: string[];
  onUnitsChange: (units: string[]) => void;
}

const defaultUnits = [
  { name: "Apartamento", icon: "🏠", color: "bg-red-100 text-red-700 border-red-300" },
  { name: "Escritório", icon: "💼", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { name: "Viagens e Lazer", icon: "✈️", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { name: "Vida Esportiva", icon: "🏋️", color: "bg-green-100 text-green-700 border-green-300" },
  { name: "Compras Pessoais", icon: "🛍️", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { name: "Go On Outdoor", icon: "⛰️", color: "bg-teal-100 text-teal-700 border-teal-300" },
  { name: "Carro", icon: "🚗", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  { name: "Comida", icon: "🍽️", color: "bg-pink-100 text-pink-700 border-pink-300" },
];

const UnitsStep = ({ selectedUnits, onUnitsChange }: UnitsStepProps) => {
  const [customUnit, setCustomUnit] = useState("");
  const [customUnits, setCustomUnits] = useState<string[]>([]);

  const toggleUnit = (unitName: string) => {
    if (selectedUnits.includes(unitName)) {
      onUnitsChange(selectedUnits.filter((u) => u !== unitName));
    } else {
      onUnitsChange([...selectedUnits, unitName]);
    }
  };

  const addCustomUnit = () => {
    if (customUnit.trim() && !selectedUnits.includes(customUnit.trim())) {
      const newUnit = customUnit.trim();
      setCustomUnits([...customUnits, newUnit]);
      onUnitsChange([...selectedUnits, newUnit]);
      setCustomUnit("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomUnit();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          Escolha suas Unidades de Negócio
        </h2>
        <p className="text-navy-600">
          Selecione as áreas que você deseja organizar suas finanças
        </p>
      </div>

      {/* Default Units Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {defaultUnits.map((unit) => {
          const isSelected = selectedUnits.includes(unit.name);
          return (
            <button
              key={unit.name}
              onClick={() => toggleUnit(unit.name)}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                isSelected
                  ? unit.color + " border-2 shadow-md"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
              <div className="text-3xl mb-2">{unit.icon}</div>
              <div className="text-sm font-medium text-center">{unit.name}</div>
            </button>
          );
        })}
      </div>

      {/* Custom Units */}
      {customUnits.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-700">Suas unidades personalizadas:</p>
          <div className="flex flex-wrap gap-2">
            {customUnits.map((unit) => (
              <Badge
                key={unit}
                variant="outline"
                className="bg-gray-100 text-gray-800 border-gray-300 py-2 px-3"
              >
                {unit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Unit */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-navy-700 mb-2">
          Adicionar unidade personalizada:
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nome da unidade"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addCustomUnit}
            disabled={!customUnit.trim()}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedUnits.length > 0 && (
        <div className="text-center text-sm text-navy-600">
          {selectedUnits.length} {selectedUnits.length === 1 ? "unidade selecionada" : "unidades selecionadas"}
        </div>
      )}
    </div>
  );
};

export default UnitsStep;
