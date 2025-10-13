import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoriesStepProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const defaultCategories = [
  { name: "Alimentação", icon: "🍔", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { name: "Transporte", icon: "🚗", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { name: "Moradia", icon: "🏠", color: "bg-green-100 text-green-700 border-green-300" },
  { name: "Saúde", icon: "⚕️", color: "bg-red-100 text-red-700 border-red-300" },
  { name: "Educação", icon: "📚", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { name: "Lazer", icon: "🎮", color: "bg-pink-100 text-pink-700 border-pink-300" },
  { name: "Vestuário", icon: "👗", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  { name: "Contas", icon: "💳", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { name: "Investimentos", icon: "💰", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { name: "Viagens", icon: "✈️", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
  { name: "Pets", icon: "🐕", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { name: "Outros", icon: "📦", color: "bg-gray-100 text-gray-700 border-gray-300" },
];

const CategoriesStep = ({ selectedCategories, onCategoriesChange }: CategoriesStepProps) => {
  const [customCategory, setCustomCategory] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const toggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryName));
    } else {
      onCategoriesChange([...selectedCategories, categoryName]);
    }
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      const newCategory = customCategory.trim();
      setCustomCategories([...customCategories, newCategory]);
      onCategoriesChange([...selectedCategories, newCategory]);
      setCustomCategory("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomCategory();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-purple-100 rounded-full">
            <Tag className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          Escolha suas Categorias
        </h2>
        <p className="text-navy-600">
          Selecione as categorias para classificar seus gastos e receitas
        </p>
      </div>

      {/* Default Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {defaultCategories.map((category) => {
          const isSelected = selectedCategories.includes(category.name);
          return (
            <button
              key={category.name}
              onClick={() => toggleCategory(category.name)}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                isSelected
                  ? category.color + " border-2 shadow-md"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
              <div className="text-3xl mb-2">{category.icon}</div>
              <div className="text-sm font-medium text-center">{category.name}</div>
            </button>
          );
        })}
      </div>

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-700">Suas categorias personalizadas:</p>
          <div className="flex flex-wrap gap-2">
            {customCategories.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="bg-gray-100 text-gray-800 border-gray-300 py-2 px-3"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Category */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-navy-700 mb-2">
          Adicionar categoria personalizada:
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nome da categoria"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addCustomCategory}
            disabled={!customCategory.trim()}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedCategories.length > 0 && (
        <div className="text-center text-sm text-navy-600">
          {selectedCategories.length} {selectedCategories.length === 1 ? "categoria selecionada" : "categorias selecionadas"}
        </div>
      )}
    </div>
  );
};

export default CategoriesStep;
