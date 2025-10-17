import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";
import OrcamentosHeader from "@/components/orcamentos/OrcamentosHeader";
import OrcamentosList from "@/components/orcamentos/OrcamentosList";
import OrcamentosProgress from "@/components/orcamentos/OrcamentosProgress";
import NewOrcamentoModal from "@/components/orcamentos/NewOrcamentoModal";
import { useOrcamentos } from "@/hooks/useOrcamentos";

const Orcamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    orcamentos,
    gastosPorUnidade,
    businessUnits,
    createOrcamentoMutation,
    updateOrcamentoMutation,
    deleteOrcamentoMutation
  } = useOrcamentos(user, selectedMonth);

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <OrcamentosHeader
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onNewOrcamento={() => setShowNewModal(true)}
      />

      <OrcamentosProgress
        orcamentos={orcamentos}
        gastosPorUnidade={gastosPorUnidade}
      />

      <OrcamentosList
        orcamentos={orcamentos}
        gastosPorUnidade={gastosPorUnidade}
        onEdit={(orcamento) => console.log('Edit', orcamento)}
        onDelete={(id) => deleteOrcamentoMutation.mutate(id)}
      />

      <NewOrcamentoModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSubmit={(data) => {
          createOrcamentoMutation.mutate(data);
          setShowNewModal(false);
        }}
        isLoading={createOrcamentoMutation.isPending}
        businessUnits={businessUnits}
      />
    </div>
  );
};

export default Orcamentos;
