import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RecurringBill } from "./types";

export const useContasState = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{billId: string, currentValue: number} | null>(null);

  useEffect(() => {
    console.log("🔐 Verificando autenticação...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      console.log("👤 Usuário autenticado:", session?.user?.email || "Nenhum");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      console.log("🔄 Mudança de auth:", session?.user?.email || "Nenhum");
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    setUser,
    showNewBillModal,
    setShowNewBillModal,
    editingBill,
    setEditingBill,
    editingAdjustment,
    setEditingAdjustment
  };
};