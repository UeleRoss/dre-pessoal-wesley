import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessUnits } from "@/hooks/useBusinessUnits";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessUnitsNavProps {
  onSelectUnit?: (unitId: string | null) => void;
}

const BusinessUnitsNav = ({ onSelectUnit }: BusinessUnitsNavProps) => {
  const [user, setUser] = useState<any>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const { businessUnits, isLoading } = useBusinessUnits(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSelectUnit = (unitId: string | null) => {
    setSelectedUnitId(unitId);
    onSelectUnit?.(unitId);
  };

  if (isLoading || businessUnits.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100 p-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
        <div className="flex items-center gap-2 text-sm text-blue-900 mr-3 whitespace-nowrap">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">Unidades:</span>
        </div>

        <Button
          size="sm"
          variant={selectedUnitId === null ? "default" : "outline"}
          onClick={() => handleSelectUnit(null)}
          className={cn(
            "whitespace-nowrap font-medium",
            selectedUnitId === null && "shadow-md"
          )}
        >
          Todas
        </Button>

        {businessUnits.map((unit) => (
          <Button
            key={unit.id}
            size="sm"
            variant={selectedUnitId === unit.id ? "default" : "outline"}
            onClick={() => handleSelectUnit(unit.id)}
            className={cn(
              "whitespace-nowrap flex items-center gap-2 font-medium transition-all",
              selectedUnitId === unit.id && "shadow-md scale-105"
            )}
            style={{
              ...(selectedUnitId === unit.id && {
                backgroundColor: unit.color,
                borderColor: unit.color,
                color: 'white',
              }),
            }}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                selectedUnitId !== unit.id && "border-2"
              )}
              style={{
                backgroundColor: selectedUnitId === unit.id ? 'white' : unit.color,
                borderColor: unit.color,
              }}
            />
            {unit.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BusinessUnitsNav;
