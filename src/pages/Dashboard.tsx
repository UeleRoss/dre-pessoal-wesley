import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardCategoryAnalysis from "@/components/dashboard/DashboardCategoryAnalysis";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '12months' | 'year'>('6months');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const dashboardData = useDashboardData(user, selectedPeriod);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <DashboardStats data={dashboardData} />

      <DashboardCharts data={dashboardData} />

      <DashboardCategoryAnalysis data={dashboardData} />
    </div>
  );
};

export default Dashboard;
