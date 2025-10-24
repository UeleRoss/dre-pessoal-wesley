export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bank_balances: {
        Row: {
          baseline_date: string
          bank_name: string
          created_at: string
          id: string
          initial_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_date?: string
          bank_name: string
          created_at?: string
          id?: string
          initial_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_date?: string
          bank_name?: string
          created_at?: string
          id?: string
          initial_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bill_adjustments: {
        Row: {
          adjusted_value: number
          bill_id: string
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjusted_value: number
          bill_id: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjusted_value?: number
          bill_id?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_card_charges: {
        Row: {
          ativo: boolean
          card: string
          created_at: string
          description: string
          id: string
          observacao: string | null
          parcelas: number | null
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          ativo?: boolean
          card: string
          created_at?: string
          description: string
          id?: string
          observacao?: string | null
          parcelas?: number | null
          type: string
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          ativo?: boolean
          card?: string
          created_at?: string
          description?: string
          id?: string
          observacao?: string | null
          parcelas?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          closing_day: number
          color: string
          created_at: string
          credit_limit: number | null
          due_day: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_day: number
          color?: string
          created_at?: string
          credit_limit?: number | null
          due_day: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closing_day?: number
          color?: string
          created_at?: string
          credit_limit?: number | null
          due_day?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_units: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_templates: {
        Row: {
          amount: number
          business_unit_id: string | null
          category: string
          created_at: string
          credit_card: string | null
          description: string
          id: string
          is_active: boolean
          last_generated_month: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          business_unit_id?: string | null
          category: string
          created_at?: string
          credit_card?: string | null
          description: string
          id?: string
          is_active?: boolean
          last_generated_month?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_unit_id?: string | null
          category?: string
          created_at?: string
          credit_card?: string | null
          description?: string
          id?: string
          is_active?: boolean
          last_generated_month?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unit_categories: {
        Row: {
          business_unit_id: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_categories_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_items: {
        Row: {
          amount: number
          bank: string
          business_unit_id: string | null
          category: string
          created_at: string
          credit_card: string | null
          date: string
          description: string
          id: string
          installment_group_id: string | null
          installment_number: number | null
          is_installment: boolean
          is_recurring: boolean
          purchase_date: string | null
          recurring_status: string | null
          recurring_template_id: string | null
          source: string | null
          total_installments: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank: string
          business_unit_id?: string | null
          category: string
          created_at?: string
          credit_card?: string | null
          date: string
          description: string
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          is_installment?: boolean
          is_recurring?: boolean
          purchase_date?: string | null
          recurring_status?: string | null
          recurring_template_id?: string | null
          source?: string | null
          total_installments?: number | null
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          bank?: string
          business_unit_id?: string | null
          category?: string
          created_at?: string
          credit_card?: string | null
          date?: string
          description?: string
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          is_installment?: boolean
          is_recurring?: boolean
          purchase_date?: string | null
          recurring_status?: string | null
          recurring_template_id?: string | null
          source?: string | null
          total_installments?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_items_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_items_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_summary: {
        Row: {
          category: string
          created_at: string
          id: string
          month: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          month: string
          total_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          month?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_summary_income: {
        Row: {
          created_at: string
          id: string
          month: string
          source: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          source: string
          total_value: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          source?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          amount: number
          bank: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          investment_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          bank?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          investment_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          bank?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          investment_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          category: string
          created_at: string
          current_balance: number
          id: string
          initial_amount: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_amount?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_amount?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      "não desligamento": {
        Row: {
          campo: string | null
          created_at: string
          id: number
          "off/on": boolean | null
        }
        Insert: {
          campo?: string | null
          created_at?: string
          id?: number
          "off/on"?: boolean | null
        }
        Update: {
          campo?: string | null
          created_at?: string
          id?: number
          "off/on"?: boolean | null
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          bank: string
          category: string
          created_at: string
          due_date: number
          id: string
          name: string
          paid_this_month: boolean
          recurring: boolean
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          bank: string
          category: string
          created_at?: string
          due_date: number
          id?: string
          name: string
          paid_this_month?: boolean
          recurring?: boolean
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          bank?: string
          category?: string
          created_at?: string
          due_date?: number
          id?: string
          name?: string
          paid_this_month?: boolean
          recurring?: boolean
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      recurring_bills_instances: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          month_reference: string
          pago: boolean
          updated_at: string
          user_id: string
          valor_ajustado: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          month_reference: string
          pago?: boolean
          updated_at?: string
          user_id: string
          valor_ajustado?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          month_reference?: string
          pago?: boolean
          updated_at?: string
          user_id?: string
          valor_ajustado?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_completed: boolean
          theme_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          onboarding_completed?: boolean
          theme_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed?: boolean
          theme_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
