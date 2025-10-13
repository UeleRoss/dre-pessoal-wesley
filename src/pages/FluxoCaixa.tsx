import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";
import FluxoCaixaHeader from "@/components/fluxo-caixa/FluxoCaixaHeader";
import FluxoCaixaTimeline from "@/components/fluxo-caixa/FluxoCaixaTimeline";
import FluxoCaixaChart from "@/components/fluxo-caixa/FluxoCaixaChart";
import FluxoCaixaSummary from "@/components/fluxo-caixa/FluxoCaixaSummary";
import { useFluxoCaixa } from "@/hooks/useFluxoCaixa";

const FluxoCaixa = () => {
  const [user, setUser] = useState<any>(null);
  const [monthsAhead, setMonthsAhead] = useState(3);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { projection, currentBalance } = useFluxoCaixa(user, monthsAhead);

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <FluxoCaixaHeader
        monthsAhead={monthsAhead}
        onMonthsChange={setMonthsAhead}
      />

      <FluxoCaixaSummary
        currentBalance={currentBalance}
        projection={projection}
      />

      <FluxoCaixaChart projection={projection} />

      <FluxoCaixaTimeline projection={projection} />
    </div>
  );
};

export default FluxoCaixa;
