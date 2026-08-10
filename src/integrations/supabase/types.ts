import { ExpenseResponse, GroupDashboardInterface, GroupResponse } from "@/lib/storage"

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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blog_categories: {
        Row: {
          created_at: string
          description: string
          notes: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_drafts: {
        Row: {
          author: string | null
          blog_id: string
          category: string | null
          content: string
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          no_index: boolean
          published_at: string | null
          reading_time: number
          schema_json: Json | null
          slug: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          blog_id: string
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          no_index?: boolean
          published_at?: string | null
          reading_time?: number
          schema_json?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          blog_id?: string
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          no_index?: boolean
          published_at?: string | null
          reading_time?: number
          schema_json?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_drafts_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author: string | null
          category: string | null
          content: string
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          reading_time: number
          no_index: boolean
          schema_json: Json | null
          slug: string | null
          status: Database["public"]["Enums"]["blog_status"]
          title: string | null
          updated_at: string
          views: number
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_time?: number
          no_index?: boolean
          schema_json?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["blog_status"]
          title?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_time?: number
          no_index?: boolean
          schema_json?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["blog_status"]
          title?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      expense_payers: {
        Row: {
          amount: number
          expense_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payers_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_participants: {
        Row: {
          expense_id: string
          id: string
          share_amount: number | null
          share_percent: number | null
          user_id: string
        }
        Insert: {
          expense_id: string
          id?: string
          share_amount?: number | null
          share_percent?: number | null
          user_id: string
        }
        Update: {
          expense_id?: string
          id?: string
          share_amount?: number | null
          share_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_participants_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_data_url: string | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          date: string
          description: string
          notes?: string | null
          group_id: string
          id: string
          paid_by_user_id: string | null
          split_type: Database["public"]["Enums"]["split_type"]
          subcategory: string
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_data_url?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          currency: string
          date: string
          description: string
          group_id: string
          id?: string
          paid_by_user_id?: string | null
          split_type: Database["public"]["Enums"]["split_type"]
          subcategory: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_data_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description?: string
          notes?: string | null
          group_id?: string
          id?: string
          paid_by_user_id?: string | null
          split_type?: Database["public"]["Enums"]["split_type"]
          subcategory?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_user_id_fkey"
            columns: ["paid_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          nickname: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider: Database["public"]["Enums"]["auth_provider"] | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          is_email_verified: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"] | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_email_verified?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"] | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_email_verified?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group_with_members: {
        Args: {
          group_currency: string
          group_name: string
          member_names: string[]
        }
        Returns: GroupResponse
      },
      cleanup_orphan_users: {
        Args: {
          p_user_ids: string[]
        }
        Returns: undefined
      },
      delete_group_and_cleanup_users: {
        Args: {
          p_group_id: string
        }
        Returns: undefined
      },
      add_expense: {
        Args: {
          p_group_id: string
          p_description: string
          p_amount: number
          p_currency: string
          p_paid_by_user_id?: string | null
          p_split_type: string
          p_category: string
          p_subcategory: string
          p_date: string
          p_participants: {
            userId: string
            amount?: number | null
            percent?: number | null
          }[]
          p_payers?: {
            userId: string
            amount: number
          }[] | null
          p_notes?: string | null
        }
        Returns: ExpenseResponse
      },
      edit_expense: {
        Args: {
          p_expense_id: string
          p_group_id: string
          p_description: string
          p_amount: number
          p_currency: string
          p_paid_by_user_id?: string | null
          p_split_type: string
          p_category: string
          p_subcategory: string
          p_date: string
          p_participants: {
            userId: string
            amount?: number | null
            percent?: number | null
          }[]
          p_payers?: {
            userId: string
            amount: number
          }[] | null
          p_notes?: string | null
        }
        Returns: ExpenseResponse
      },
      increment_blog_view: {
        Args: {
          p_blog_id: string
        }
        Returns: boolean
      },
      load_group_details: {
        Args: {
          group_id: string
        }
        Returns: GroupDashboardInterface
      },
    }
    Enums: {
      auth_provider: "email" | "google" | "apple"
      blog_status: "draft" | "published"
      split_type: "equal" | "percentage" | "custom"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      auth_provider: ["email", "google", "apple"],
      blog_status: ["draft", "published"],
      split_type: ["equal", "percentage", "custom"],
    },
  },
} as const
