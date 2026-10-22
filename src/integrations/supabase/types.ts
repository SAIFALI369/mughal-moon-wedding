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
      ai_message_usage: {
        Row: {
          scope: string
          updated_at: string
          used: number
          visitor_key: string
          window_started_at: string
        }
        Insert: {
          scope: string
          updated_at?: string
          used?: number
          visitor_key: string
          window_started_at?: string
        }
        Update: {
          scope?: string
          updated_at?: string
          used?: number
          visitor_key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      invitation_cards: {
        Row: {
          content: Json
          created_at: string
          expires_at: string | null
          id: string
          owner_id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitation_photos: {
        Row: {
          caption: string
          card_id: string
          created_at: string
          id: string
          image_data: string
          slot: number
          source: string
          uploader_id: string | null
        }
        Insert: {
          caption?: string
          card_id: string
          created_at?: string
          id?: string
          image_data: string
          slot: number
          source?: string
          uploader_id?: string | null
        }
        Update: {
          caption?: string
          card_id?: string
          created_at?: string
          id?: string
          image_data?: string
          slot?: number
          source?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_photos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "invitation_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_rsvps: {
        Row: {
          attending: boolean
          card_id: string
          contact: string
          created_at: string
          dietary: string
          guests: number
          id: string
          message: string
          name: string
        }
        Insert: {
          attending: boolean
          card_id: string
          contact?: string
          created_at?: string
          dietary?: string
          guests: number
          id?: string
          message?: string
          name: string
        }
        Update: {
          attending?: boolean
          card_id?: string
          contact?: string
          created_at?: string
          dietary?: string
          guests?: number
          id?: string
          message?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_rsvps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "invitation_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_wishes: {
        Row: {
          card_id: string
          created_at: string
          id: string
          message: string
          name: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          message: string
          name: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_wishes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "invitation_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cash_packages: {
        Row: {
          amount_inr: number
          card_credits: number
          id: string
          owner_id: string
          payment_method: string
          recorded_at: string
        }
        Insert: {
          amount_inr?: number
          card_credits?: number
          id?: string
          owner_id: string
          payment_method?: string
          recorded_at?: string
        }
        Update: {
          amount_inr?: number
          card_credits?: number
          id?: string
          owner_id?: string
          payment_method?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_cash_packages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "print_partners"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      print_partners: {
        Row: {
          active: boolean
          cards_created: number
          cards_purchased: number
          created_at: string
          owner_id: string
          shop_name: string
        }
        Insert: {
          active?: boolean
          cards_created?: number
          cards_purchased?: number
          created_at?: string
          owner_id: string
          shop_name: string
        }
        Update: {
          active?: boolean
          cards_created?: number
          cards_purchased?: number
          created_at?: string
          owner_id?: string
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_partners_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      username_login_attempts: {
        Row: {
          attempts: number
          username: string
          window_start: string
        }
        Insert: {
          attempts: number
          username: string
          window_start: string
        }
        Update: {
          attempts?: number
          username?: string
          window_start?: string
        }
        Relationships: []
      }
      wedding_photos: {
        Row: {
          caption: string
          created_at: string
          image_data: string
          owner_id: string | null
          slot: number
        }
        Insert: {
          caption: string
          created_at?: string
          image_data: string
          owner_id?: string | null
          slot: number
        }
        Update: {
          caption?: string
          created_at?: string
          image_data?: string
          owner_id?: string | null
          slot?: number
        }
        Relationships: []
      }
      wedding_rsvps: {
        Row: {
          created_at: string
          diet: string
          events: string[]
          guests: number
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          diet?: string
          events?: string[]
          guests: number
          id?: string
          message?: string
          name: string
        }
        Update: {
          created_at?: string
          diet?: string
          events?: string[]
          guests?: number
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      wedding_wishes: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_invitation_photo: {
        Args: { p_card_id: string; photo_caption: string; photo_data: string }
        Returns: number
      }
      add_wedding_photo: {
        Args: { photo_caption: string; photo_data: string }
        Returns: number
      }
      consume_ai_message: {
        Args: {
          p_limit: number
          p_scope: string
          p_visitor: string
          p_window_hours?: number
        }
        Returns: Json
      }
      delete_expired_invitations: { Args: never; Returns: number }
      delete_invitation_photo: {
        Args: { p_card_id: string; target_slot: number }
        Returns: undefined
      }
      delete_wedding_photo: {
        Args: { target_slot: number }
        Returns: undefined
      }
      ensure_account_access: {
        Args: { account_id: string }
        Returns: undefined
      }
      provision_print_partner: {
        Args: {
          requested_password: string
          requested_shop_name: string
          requested_username: string
        }
        Returns: string
      }
      record_partner_cash_package: {
        Args: { requested_shop_name: string; requested_username: string }
        Returns: string
      }
      refund_ai_message: {
        Args: { p_scope: string; p_visitor: string }
        Returns: undefined
      }
      register_username: {
        Args: { requested_password: string; requested_username: string }
        Returns: undefined
      }
      replace_wedding_photo: {
        Args: { photo_caption: string; photo_data: string; target_slot: number }
        Returns: undefined
      }
      username_login_address: {
        Args: { requested_password: string; requested_username: string }
        Returns: string
      }
      valid_guest_name: { Args: { candidate: string }; Returns: boolean }
      valid_invitation_portrait: { Args: { photo: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
