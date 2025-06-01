
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import CreditCardChargesList from "./CreditCardChargesList";
import CreditCardChargeModal from "./CreditCardChargeModal";
import CreditCardChargesFilters from "./CreditCardChargesFilters";
import CreditCardMonthlySummary from "./CreditCardMonthlySummary";
import MonthSelector from "./MonthSelector";
import { useCreditCardCharges } from "./useCreditCardCharges";

const CreditCardChargesSection = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    card: 'all',
    type: 'all',
    status: 'all'
  });

  const {
    charges,
    createChargeMutation,
    updateChargeMutation,
    deleteChargeMutation
  } = useCreditCardCharges();

  const handleSubmit = (data: any) => {
    if (editingCharge) {
      updateChargeMutation.mutate({
        id: editingCharge.id,
        data: { ...data, value: parseFloat(data.value) }
      });
    } else {
      createChargeMutation.mutate({
        ...data,
        value: parseFloat(data.value)
      });
    }
  };

  const handleEdit = (charge: any) => {
    setEditingCharge(charge);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCharge(null);
  };

  const filteredCharges = charges.filter(charge => {
    if (filters.card !== 'all' && charge.card !== filters.card) return false;
    if (filters.type !== 'all' && charge.type !== filters.type) return false;
    if (filters.status !== 'all') {
      if (filters.status === 'ativo' && !charge.ativo) return false;
      if (filters.status === 'inativo' && charge.ativo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Cobranças no Cartão de Crédito</CardTitle>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Cobrança
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Monitor dedicado para controle de gastos no cartão de crédito
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <MonthSelector 
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          
          <CreditCardMonthlySummary 
            charges={charges}
            selectedMonth={selectedMonth}
          />
          
          <CreditCardChargesFilters filters={filters} onFiltersChange={setFilters} />
          
          <CreditCardChargesList
            charges={filteredCharges}
            onEdit={handleEdit}
            onDelete={(id) => deleteChargeMutation.mutate(id)}
            onToggleStatus={(id, ativo) => updateChargeMutation.mutate({ id, data: { ativo } })}
          />

          <CreditCardChargeModal
            isOpen={showModal}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
            editingCharge={editingCharge}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditCardChargesSection;
