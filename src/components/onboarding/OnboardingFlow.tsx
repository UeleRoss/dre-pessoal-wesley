import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import WelcomeStep from "./WelcomeStep";
import UnitsStep from "./UnitsStep";
import CategoriesStep from "./CategoriesStep";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CheckCircle2 } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: "",
    selectedUnits: [] as string[],
    selectedCategories: [] as string[],
  });

  const { updateProfile, completeOnboarding, isCompletingOnboarding } = useUserProfile();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Atualizar o nome do usuário
    updateProfile({ display_name: formData.displayName });

    // Marcar onboarding como completo
    completeOnboarding();

    // Chamar callback de conclusão
    onComplete();
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.displayName.trim().length > 0;
      case 2:
        return formData.selectedUnits.length > 0;
      case 3:
        return formData.selectedCategories.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6 md:p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-navy-700">
                Etapa {currentStep} de {totalSteps}
              </span>
              <span className="text-sm text-navy-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Content */}
          <div className="mb-8">
            {currentStep === 1 && (
              <WelcomeStep
                displayName={formData.displayName}
                onNameChange={(name) => updateFormData("displayName", name)}
              />
            )}
            {currentStep === 2 && (
              <UnitsStep
                selectedUnits={formData.selectedUnits}
                onUnitsChange={(units) => updateFormData("selectedUnits", units)}
              />
            )}
            {currentStep === 3 && (
              <CategoriesStep
                selectedCategories={formData.selectedCategories}
                onCategoriesChange={(categories) => updateFormData("selectedCategories", categories)}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="w-32"
            >
              Voltar
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-32"
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isCompletingOnboarding}
                className="w-32 bg-green-600 hover:bg-green-700"
              >
                {isCompletingOnboarding ? (
                  "Finalizando..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluir
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
