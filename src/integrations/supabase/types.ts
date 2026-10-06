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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          address: string | null
          category_id: string | null
          commission_rate: number | null
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          instagram: string | null
          location_id: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          payout_details: string | null
          phone: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["review_status"]
          verification_info: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          location_id?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payout_details?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          verification_info?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          location_id?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payout_details?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          verification_info?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          commission_rate: number | null
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          commission_rate?: number | null
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          commission_rate?: number | null
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          promotion_id: string | null
          reason: string
          redemption_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          promotion_id?: string | null
          reason: string
          redemption_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          promotion_id?: string | null
          reason?: string
          redemption_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "disputes_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          promotion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          promotion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          promotion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          area: string
          city: string
          country: string
          id: string
          lat: number | null
          lng: number | null
        }
        Insert: {
          area: string
          city: string
          country?: string
          id?: string
          lat?: number | null
          lng?: number | null
        }
        Update: {
          area?: string
          city?: string
          country?: string
          id?: string
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          default_commission_rate: number
          id: number
          updated_at: string
        }
        Insert: {
          default_commission_rate?: number
          id?: number
          updated_at?: string
        }
        Update: {
          default_commission_rate?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_area: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_area?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_area?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          business_id: string
          category_id: string | null
          created_at: string
          description: string | null
          discount_pct: number | null
          ends_at: string
          id: string
          image_url: string | null
          instructions: string | null
          is_featured: boolean
          is_flagged: boolean
          location_id: string | null
          max_redemptions: number | null
          online_url: string | null
          original_price: number
          promo_price: number
          redemption_method: Database["public"]["Enums"]["redemption_method"]
          starts_at: string
          status: Database["public"]["Enums"]["review_status"]
          tags: string[]
          terms: string | null
          title: string
          view_count: number
        }
        Insert: {
          business_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          ends_at: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_featured?: boolean
          is_flagged?: boolean
          location_id?: string | null
          max_redemptions?: number | null
          online_url?: string | null
          original_price: number
          promo_price: number
          redemption_method?: Database["public"]["Enums"]["redemption_method"]
          starts_at?: string
          status?: Database["public"]["Enums"]["review_status"]
          tags?: string[]
          terms?: string | null
          title: string
          view_count?: number
        }
        Update: {
          business_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          ends_at?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_featured?: boolean
          is_flagged?: boolean
          location_id?: string | null
          max_redemptions?: number | null
          online_url?: string | null
          original_price?: number
          promo_price?: number
          redemption_method?: Database["public"]["Enums"]["redemption_method"]
          starts_at?: string
          status?: Database["public"]["Enums"]["review_status"]
          tags?: string[]
          terms?: string | null
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          business_id: string
          code: string
          commission_amount: number | null
          commission_paid: boolean
          commission_paid_at: string | null
          commission_rate: number | null
          completed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["redemption_method"]
          promotion_id: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_value: number | null
          user_id: string
        }
        Insert: {
          business_id: string
          code: string
          commission_amount?: number | null
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_rate?: number | null
          completed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["redemption_method"]
          promotion_id: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_value?: number | null
          user_id: string
        }
        Update: {
          business_id?: string
          code?: string
          commission_amount?: number | null
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_rate?: number | null
          completed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["redemption_method"]
          promotion_id?: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string | null
          business_id: string
          comment: string | null
          created_at: string
          id: string
          promotion_id: string | null
          rating: number
          user_id: string
        }
        Insert: {
          author_name?: string | null
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          promotion_id?: string | null
          rating: number
          user_id: string
        }
        Update: {
          author_name?: string | null
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          promotion_id?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      admin_user_count: { Args: never; Returns: number }
      claim_first_admin: { Args: never; Returns: boolean }
      confirm_redemption: {
        Args: { _code: string; _transaction_value: number }
        Returns: {
          business_id: string
          code: string
          commission_amount: number | null
          commission_paid: boolean
          commission_paid_at: string | null
          commission_rate: number | null
          completed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["redemption_method"]
          promotion_id: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_value: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view: { Args: { _promotion_id: string }; Returns: undefined }
      lookup_redemption: {
        Args: { _code: string }
        Returns: {
          code: string
          created_at: string
          customer_name: string
          ends_at: string
          id: string
          original_price: number
          promo_price: number
          promotion_title: string
          status: Database["public"]["Enums"]["redemption_status"]
        }[]
      }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      redeem_promotion: {
        Args: { _promotion_id: string }
        Returns: {
          business_id: string
          code: string
          commission_amount: number | null
          commission_paid: boolean
          commission_paid_at: string | null
          commission_rate: number | null
          completed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["redemption_method"]
          promotion_id: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_value: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeemed_count: { Args: { _promotion_id: string }; Returns: number }
      register_business: {
        Args: {
          _address: string
          _category_id: string
          _contact_person: string
          _description: string
          _email: string
          _instagram: string
          _location_id: string
          _logo_url: string
          _name: string
          _payout_details: string
          _phone: string
          _verification_info: string
          _website: string
        }
        Returns: {
          address: string | null
          category_id: string | null
          commission_rate: number | null
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          instagram: string | null
          location_id: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          payout_details: string | null
          phone: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["review_status"]
          verification_info: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "business" | "customer"
      dispute_status: "open" | "investigating" | "resolved" | "rejected"
      redemption_method: "coupon" | "qr" | "online" | "booking" | "claim"
      redemption_status:
        | "available"
        | "redeemed"
        | "completed"
        | "cancelled"
        | "reversed"
      review_status: "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "business", "customer"],
      dispute_status: ["open", "investigating", "resolved", "rejected"],
      redemption_method: ["coupon", "qr", "online", "booking", "claim"],
      redemption_status: [
        "available",
        "redeemed",
        "completed",
        "cancelled",
        "reversed",
      ],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const
