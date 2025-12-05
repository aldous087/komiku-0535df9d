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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_2fa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      admin_otp: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          position: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          position: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          position?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_rate_limit: {
        Row: {
          action: string
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string | null
          id: string
          komik_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          komik_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          komik_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_komik_id_fkey"
            columns: ["komik_id"]
            isOneToOne: false
            referencedRelation: "komik"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_images: {
        Row: {
          chapter_id: string
          created_at: string | null
          id: string
          image_url: string
          order_index: number
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          id?: string
          image_url: string
          order_index: number
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_images_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_pages: {
        Row: {
          cached_at: string | null
          cached_image_url: string | null
          chapter_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          page_number: number
          source_image_url: string
        }
        Insert: {
          cached_at?: string | null
          cached_image_url?: string | null
          chapter_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          page_number: number
          source_image_url: string
        }
        Update: {
          cached_at?: string | null
          cached_image_url?: string | null
          chapter_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          page_number?: number
          source_image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_pages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          created_at: string | null
          id: string
          komik_id: string
          source_chapter_id: string | null
          source_url: string | null
          title: string | null
        }
        Insert: {
          chapter_number: number
          created_at?: string | null
          id?: string
          komik_id: string
          source_chapter_id?: string | null
          source_url?: string | null
          title?: string | null
        }
        Update: {
          chapter_number?: number
          created_at?: string | null
          id?: string
          komik_id?: string
          source_chapter_id?: string | null
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_komik_id_fkey"
            columns: ["komik_id"]
            isOneToOne: false
            referencedRelation: "komik"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          id: string
          komik_id: string
          text: string
          user_id: string | null
          username: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          komik_id: string
          text: string
          user_id?: string | null
          username: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          komik_id?: string
          text?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_komik_id_fkey"
            columns: ["komik_id"]
            isOneToOne: false
            referencedRelation: "komik"
            referencedColumns: ["id"]
          },
        ]
      }
      komik: {
        Row: {
          banner_url: string | null
          bookmark_count: number | null
          chapter_count: number | null
          country_flag_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          dominant_color: string | null
          genres: string[] | null
          id: string
          is_color: boolean | null
          origin_country: string | null
          popularity_score: number | null
          rating: number | null
          rating_admin: number | null
          slug: string
          source_id: string | null
          source_slug: string | null
          source_url: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          view_count: number | null
          views_today: number | null
          views_week: number | null
        }
        Insert: {
          banner_url?: string | null
          bookmark_count?: number | null
          chapter_count?: number | null
          country_flag_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          dominant_color?: string | null
          genres?: string[] | null
          id?: string
          is_color?: boolean | null
          origin_country?: string | null
          popularity_score?: number | null
          rating?: number | null
          rating_admin?: number | null
          slug: string
          source_id?: string | null
          source_slug?: string | null
          source_url?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          view_count?: number | null
          views_today?: number | null
          views_week?: number | null
        }
        Update: {
          banner_url?: string | null
          bookmark_count?: number | null
          chapter_count?: number | null
          country_flag_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          dominant_color?: string | null
          genres?: string[] | null
          id?: string
          is_color?: boolean | null
          origin_country?: string | null
          popularity_score?: number | null
          rating?: number | null
          rating_admin?: number | null
          slug?: string
          source_id?: string | null
          source_slug?: string | null
          source_url?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          view_count?: number | null
          views_today?: number | null
          views_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "komik_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          chapter_id: string
          created_at: string | null
          id: string
          komik_id: string
          last_page: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          id?: string
          komik_id: string
          last_page?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          id?: string
          komik_id?: string
          last_page?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_history_komik_id_fkey"
            columns: ["komik_id"]
            isOneToOne: false
            referencedRelation: "komik"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          action: string | null
          created_at: string | null
          error_message: string | null
          id: string
          source_id: string | null
          status: string | null
          target_url: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          source_id?: string | null
          status?: string | null
          target_url?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          source_id?: string | null
          status?: string | null
          target_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          base_url: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          base_url: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          base_url?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          created_at: string | null
          email: string | null
          event: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_popularity_scores: { Args: never; Returns: undefined }
      check_auth_rate_limit: {
        Args: {
          _action: string
          _email: string
          _ip_address: string
          _max_requests: number
          _window_hours: number
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _action: string
          _identifier: string
          _max_requests: number
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_auth_data: { Args: never; Returns: Json }
      generate_admin_otp: { Args: { admin_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_2fa_session: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      increment_komik_view: { Args: { komik_id: string }; Returns: undefined }
      log_audit_event: {
        Args: {
          _action: string
          _ip_address?: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      log_auth_rate_limit: {
        Args: { _action: string; _email: string; _ip_address: string }
        Returns: undefined
      }
      log_verification_event: {
        Args: {
          _email: string
          _event: string
          _ip_address?: string
          _metadata?: Json
          _user_id: string
        }
        Returns: string
      }
      reset_daily_views: { Args: never; Returns: undefined }
      toggle_bookmark: {
        Args: { _komik_id: string; _user_id: string }
        Returns: Json
      }
      verify_admin_otp: {
        Args: { admin_email: string; submitted_otp: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
