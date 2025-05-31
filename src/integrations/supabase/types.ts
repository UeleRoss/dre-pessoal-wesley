export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_balances: {
        Row: {
          bank_name: string
          created_at: string
          id: string
          initial_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          id?: string
          initial_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          id?: string
          initial_balance?: number
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
      financial_items: {
        Row: {
          amount: number
          bank: string
          category: string
          created_at: string
          date: string
          description: string
          id: string
          source: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank: string
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          source?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank?: string
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          source?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
