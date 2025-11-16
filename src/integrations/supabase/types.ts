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
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string
          display_order: number | null
          icon: string
          id: string
          name: string
          requirement_count: number
          requirement_type: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number | null
          icon: string
          id?: string
          name: string
          requirement_count: number
          requirement_type: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number | null
          icon?: string
          id?: string
          name?: string
          requirement_count?: number
          requirement_type?: string
        }
        Relationships: []
      }
      career_paths: {
        Row: {
          affirmations: string[] | null
          all_images: string[] | null
          category: string | null
          created_at: string
          description: string
          difficulty_level: string | null
          id: string
          image_url: string | null
          impact_areas: string[] | null
          journey_duration: string | null
          key_skills: string[] | null
          lifestyle_benefits: string[] | null
          roadmap: Json | null
          salary_range: string | null
          target_companies: string[] | null
          title: string
          typical_day_routine: string[] | null
          updated_at: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          affirmations?: string[] | null
          all_images?: string[] | null
          category?: string | null
          created_at?: string
          description: string
          difficulty_level?: string | null
          id?: string
          image_url?: string | null
          impact_areas?: string[] | null
          journey_duration?: string | null
          key_skills?: string[] | null
          lifestyle_benefits?: string[] | null
          roadmap?: Json | null
          salary_range?: string | null
          target_companies?: string[] | null
          title: string
          typical_day_routine?: string[] | null
          updated_at?: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          affirmations?: string[] | null
          all_images?: string[] | null
          category?: string | null
          created_at?: string
          description?: string
          difficulty_level?: string | null
          id?: string
          image_url?: string | null
          impact_areas?: string[] | null
          journey_duration?: string | null
          key_skills?: string[] | null
          lifestyle_benefits?: string[] | null
          roadmap?: Json | null
          salary_range?: string | null
          target_companies?: string[] | null
          title?: string
          typical_day_routine?: string[] | null
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clone_waiting_list: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clone_waiting_list_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_actions: {
        Row: {
          action_date: string
          actions: Json
          all_completed: boolean
          created_at: string
          id: string
          path_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_date?: string
          actions?: Json
          all_completed?: boolean
          created_at?: string
          id?: string
          path_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_date?: string
          actions?: Json
          all_completed?: boolean
          created_at?: string
          id?: string
          path_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          streak_date: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          streak_date: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          streak_date?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          path_id: string
          priority: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          path_id: string
          priority?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          path_id?: string
          priority?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentors: {
        Row: {
          achievements: string[] | null
          career_path: Json | null
          category: string | null
          company: string | null
          company_url: string | null
          created_at: string
          education: Json | null
          experience_years: number | null
          follower_count: string | null
          headline: string | null
          id: string
          industry: string | null
          key_skills: string[] | null
          leadership_philosophy: string[] | null
          location: string | null
          mentor_embedding: string | null
          name: string
          profile_image_url: string | null
          profile_url: string | null
          title: string | null
          typical_day_routine: string[] | null
          updated_at: string
          visualization_images: string[] | null
        }
        Insert: {
          achievements?: string[] | null
          career_path?: Json | null
          category?: string | null
          company?: string | null
          company_url?: string | null
          created_at?: string
          education?: Json | null
          experience_years?: number | null
          follower_count?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          leadership_philosophy?: string[] | null
          location?: string | null
          mentor_embedding?: string | null
          name: string
          profile_image_url?: string | null
          profile_url?: string | null
          title?: string | null
          typical_day_routine?: string[] | null
          updated_at?: string
          visualization_images?: string[] | null
        }
        Update: {
          achievements?: string[] | null
          career_path?: Json | null
          category?: string | null
          company?: string | null
          company_url?: string | null
          created_at?: string
          education?: Json | null
          experience_years?: number | null
          follower_count?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          leadership_philosophy?: string[] | null
          location?: string | null
          mentor_embedding?: string | null
          name?: string
          profile_image_url?: string | null
          profile_url?: string | null
          title?: string | null
          typical_day_routine?: string[] | null
          updated_at?: string
          visualization_images?: string[] | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_photos: {
        Row: {
          created_at: string
          id: string
          is_reference: boolean | null
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_reference?: boolean | null
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_reference?: boolean | null
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active_path_id: string | null
          created_at: string
          cv_url: string | null
          display_name: string | null
          id: string
          onboarding_completed: boolean | null
          profile_embedding: string | null
          updated_at: string
          user_id: string
          voice_transcription: string | null
          wizard_data: Json | null
        }
        Insert: {
          active_path_id?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          profile_embedding?: string | null
          updated_at?: string
          user_id: string
          voice_transcription?: string | null
          wizard_data?: Json | null
        }
        Update: {
          active_path_id?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          profile_embedding?: string | null
          updated_at?: string
          user_id?: string
          voice_transcription?: string | null
          wizard_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_active_path_id_fkey"
            columns: ["active_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          id: string
          longest_streak: number
          missions_completed: number
          paths_explored: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          id?: string
          longest_streak?: number
          missions_completed?: number
          paths_explored?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          id?: string
          longest_streak?: number
          missions_completed?: number
          paths_explored?: number
          total_points?: number
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
      happenstance_search_mentors: {
        Args: { p_limit?: number; p_query_embedding: string; p_user_id: string }
        Returns: {
          company: string
          headline: string
          industry: string
          key_skills: string[]
          location: string
          matched_signals: string[]
          mentor_id: string
          name: string
          profile_image_url: string
          profile_url: string
          relevance_score: number
          title: string
        }[]
      }
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
