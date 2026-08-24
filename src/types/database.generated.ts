export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      admin_audit_events: {
        Row: {
          action: Database["public"]["Enums"]["admin_audit_action"]
          admin_user_id: string | null
          class_id: string | null
          id: string
          occurred_at: string
          request_id: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["admin_audit_action"]
          admin_user_id?: string | null
          class_id?: string | null
          id?: string
          occurred_at?: string
          request_id?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["admin_audit_action"]
          admin_user_id?: string | null
          class_id?: string | null
          id?: string
          occurred_at?: string
          request_id?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_events_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_events_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      administrators: {
        Row: {
          granted_at: string
          granted_by: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["administrator_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["administrator_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["administrator_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrators_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administrators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_events: {
        Row: {
          attempt_id: string
          class_id: string
          event_type: Database["public"]["Enums"]["attempt_event_type"]
          id: string
          mission_version_id: string
          occurred_at: string
          participant_id: string
          payload: Json
          recorded_at: string
          sequence_number: number
          step_id: string | null
        }
        Insert: {
          attempt_id: string
          class_id: string
          event_type: Database["public"]["Enums"]["attempt_event_type"]
          id?: string
          mission_version_id: string
          occurred_at?: string
          participant_id: string
          payload?: Json
          recorded_at?: string
          sequence_number: number
          step_id?: string | null
        }
        Update: {
          attempt_id?: string
          class_id?: string
          event_type?: Database["public"]["Enums"]["attempt_event_type"]
          id?: string
          mission_version_id?: string
          occurred_at?: string
          participant_id?: string
          payload?: Json
          recorded_at?: string
          sequence_number?: number
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_events_attempt_scope_fk"
            columns: [
              "attempt_id",
              "participant_id",
              "class_id",
              "mission_version_id",
            ]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: [
              "id",
              "participant_id",
              "class_id",
              "mission_version_id",
            ]
          },
          {
            foreignKeyName: "attempt_events_step_version_fk"
            columns: ["step_id", "mission_version_id"]
            isOneToOne: false
            referencedRelation: "mission_steps"
            referencedColumns: ["id", "mission_version_id"]
          },
        ]
      }
      attempts: {
        Row: {
          assignment_id: string
          class_id: string
          completed_at: string | null
          created_at: string
          current_step_id: string | null
          id: string
          last_activity_at: string
          metadata: Json
          mission_version_id: string
          participant_id: string
          participant_role: Database["public"]["Enums"]["app_role"]
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          updated_at: string
        }
        Insert: {
          assignment_id: string
          class_id: string
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          last_activity_at?: string
          metadata?: Json
          mission_version_id: string
          participant_id: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          class_id?: string
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          last_activity_at?: string
          metadata?: Json
          mission_version_id?: string
          participant_id?: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_assignment_scope_fk"
            columns: ["assignment_id", "class_id", "mission_version_id"]
            isOneToOne: false
            referencedRelation: "class_mission_assignments"
            referencedColumns: ["id", "class_id", "mission_version_id"]
          },
          {
            foreignKeyName: "attempts_current_step_version_fk"
            columns: ["current_step_id", "mission_version_id"]
            isOneToOne: false
            referencedRelation: "mission_steps"
            referencedColumns: ["id", "mission_version_id"]
          },
          {
            foreignKeyName: "attempts_participant_membership_fk"
            columns: ["class_id", "participant_id", "participant_role"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["class_id", "user_id", "role"]
          },
        ]
      }
      class_mission_assignments: {
        Row: {
          assigned_by: string
          assigned_by_role: Database["public"]["Enums"]["app_role"]
          available_from: string
          class_id: string
          created_at: string
          due_at: string | null
          id: string
          is_required: boolean
          mission_version_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_by_role?: Database["public"]["Enums"]["app_role"]
          available_from?: string
          class_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          is_required?: boolean
          mission_version_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_by_role?: Database["public"]["Enums"]["app_role"]
          available_from?: string
          class_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          is_required?: boolean
          mission_version_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_mission_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_mission_assignments_mission_version_id_fkey"
            columns: ["mission_version_id"]
            isOneToOne: false
            referencedRelation: "mission_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_mission_assignments_monitor_membership_fk"
            columns: ["class_id", "assigned_by", "assigned_by_role"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["class_id", "user_id", "role"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          shift: string | null
          slug: string
          status: Database["public"]["Enums"]["class_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          shift?: string | null
          slug: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          shift?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          acknowledged_at: string | null
          assigned_monitor_id: string | null
          assigned_monitor_role: Database["public"]["Enums"]["app_role"]
          attempt_id: string | null
          class_id: string
          created_at: string
          id: string
          message: string | null
          mission_version_id: string | null
          participant_id: string
          participant_role: Database["public"]["Enums"]["app_role"]
          requested_at: string
          resolution_note: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["help_request_status"]
          step_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_monitor_id?: string | null
          assigned_monitor_role?: Database["public"]["Enums"]["app_role"]
          attempt_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          message?: string | null
          mission_version_id?: string | null
          participant_id: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          requested_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["help_request_status"]
          step_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_monitor_id?: string | null
          assigned_monitor_role?: Database["public"]["Enums"]["app_role"]
          attempt_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          message?: string | null
          mission_version_id?: string | null
          participant_id?: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          requested_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["help_request_status"]
          step_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_assigned_monitor_membership_fk"
            columns: [
              "class_id",
              "assigned_monitor_id",
              "assigned_monitor_role",
            ]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["class_id", "user_id", "role"]
          },
          {
            foreignKeyName: "help_requests_attempt_scope_fk"
            columns: [
              "attempt_id",
              "participant_id",
              "class_id",
              "mission_version_id",
            ]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: [
              "id",
              "participant_id",
              "class_id",
              "mission_version_id",
            ]
          },
          {
            foreignKeyName: "help_requests_participant_membership_fk"
            columns: ["class_id", "participant_id", "participant_role"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["class_id", "user_id", "role"]
          },
          {
            foreignKeyName: "help_requests_step_version_fk"
            columns: ["step_id", "mission_version_id"]
            isOneToOne: false
            referencedRelation: "mission_steps"
            referencedColumns: ["id", "mission_version_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          class_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          class_id: string
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          class_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          class_id: string
          created_at: string
          ended_at: string | null
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          joined_at?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_steps: {
        Row: {
          audio_text: string | null
          created_at: string
          expected_action: Json
          hints: Json
          id: string
          instruction: string
          is_optional: boolean
          mission_version_id: string
          options: Json
          position: number
          step_type: Database["public"]["Enums"]["mission_step_type"]
          title: string
          updated_at: string
        }
        Insert: {
          audio_text?: string | null
          created_at?: string
          expected_action?: Json
          hints?: Json
          id?: string
          instruction: string
          is_optional?: boolean
          mission_version_id: string
          options?: Json
          position: number
          step_type: Database["public"]["Enums"]["mission_step_type"]
          title: string
          updated_at?: string
        }
        Update: {
          audio_text?: string | null
          created_at?: string
          expected_action?: Json
          hints?: Json
          id?: string
          instruction?: string
          is_optional?: boolean
          mission_version_id?: string
          options?: Json
          position?: number
          step_type?: Database["public"]["Enums"]["mission_step_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_steps_mission_version_id_fkey"
            columns: ["mission_version_id"]
            isOneToOne: false
            referencedRelation: "mission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_versions: {
        Row: {
          changelog: string | null
          content_language: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          learning_objective: string
          mission_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["mission_version_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          changelog?: string | null
          content_language?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          learning_objective: string
          mission_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["mission_version_status"]
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          changelog?: string | null
          content_language?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          learning_objective?: string
          mission_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["mission_version_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mission_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_versions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["mission_difficulty"]
          estimated_minutes: number
          id: string
          slug: string
          status: Database["public"]["Enums"]["mission_catalog_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          difficulty: Database["public"]["Enums"]["mission_difficulty"]
          estimated_minutes: number
          id?: string
          slug: string
          status?: Database["public"]["Enums"]["mission_catalog_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mission_difficulty"]
          estimated_minutes?: number
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["mission_catalog_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          audio_rate: number
          auto_audio: boolean
          created_at: string
          high_contrast: boolean
          larger_text: boolean
          locale: string
          onboarding_completed_at: string | null
          updated_at: string
          user_id: string
          voice_response: boolean
        }
        Insert: {
          audio_rate?: number
          auto_audio?: boolean
          created_at?: string
          high_contrast?: boolean
          larger_text?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id: string
          voice_response?: boolean
        }
        Update: {
          audio_rate?: number
          auto_audio?: boolean
          created_at?: string
          high_contrast?: boolean
          larger_text?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id?: string
          voice_response?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          block_reason_code: string | null
          blocked_at: string | null
          created_at: string
          display_name: string
          id: string
          status_changed_at: string
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          block_reason_code?: string | null
          blocked_at?: string | null
          created_at?: string
          display_name: string
          id: string
          status_changed_at?: string
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          block_reason_code?: string | null
          blocked_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          status_changed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_revoke_membership: {
        Args: {
          target_class_id: string
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      append_attempt_event: {
        Args: {
          event_id: string
          event_occurred_at?: string
          event_payload?: Json
          target_attempt_id: string
          target_event_type: Database["public"]["Enums"]["attempt_event_type"]
          target_sequence_number: number
          target_step_id?: string
        }
        Returns: {
          inserted: boolean
          stored_event_id: string
        }[]
      }
      can_monitor_user: { Args: { target_user_id: string }; Returns: boolean }
      consume_class_invitation: {
        Args: { plain_token: string }
        Returns: {
          access_role: Database["public"]["Enums"]["app_role"]
          class_id: string
        }[]
      }
      create_class_invitation: {
        Args: {
          invited_email: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          target_class_id: string
        }
        Returns: {
          expires_at: string
          invitation_id: string
          invitation_token: string
        }[]
      }
      expire_invitation_secrets: { Args: never; Returns: number }
      get_monitor_attempt_event_summaries: {
        Args: { target_attempt_id: string; target_class_id: string }
        Returns: {
          attempt_id: string
          event_id: string
          event_type: Database["public"]["Enums"]["attempt_event_type"]
          occurred_at: string
          participant_id: string
          sequence_number: number
          step_id: string
        }[]
      }
      get_monitor_attempt_summaries: {
        Args: { target_class_id: string }
        Returns: {
          assignment_id: string
          attempt_id: string
          completed_at: string
          current_step_id: string
          last_activity_at: string
          mission_version_id: string
          participant_id: string
          score: number
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
        }[]
      }
      get_my_access_roles: {
        Args: never
        Returns: {
          access_role: string
          scope_id: string
        }[]
      }
      get_my_auth_context: {
        Args: never
        Returns: {
          access_roles: string[]
          account_status: Database["public"]["Enums"]["account_status"]
          error_code: string
          user_id: string
        }[]
      }
      has_active_class_role: {
        Args: {
          required_role?: Database["public"]["Enums"]["app_role"]
          target_class_id: string
        }
        Returns: boolean
      }
      has_any_active_access: { Args: never; Returns: boolean }
      is_account_active: { Args: { target_user_id?: string }; Returns: boolean }
      is_active_class_member: {
        Args: { target_class_id: string }
        Returns: boolean
      }
      is_assignment_available: {
        Args: {
          target_assignment_id: string
          target_class_id: string
          target_version_id: string
        }
        Returns: boolean
      }
      is_class_monitor: { Args: { target_class_id: string }; Returns: boolean }
      is_global_admin: { Args: never; Returns: boolean }
      is_published_mission_version: {
        Args: { target_version_id: string }
        Returns: boolean
      }
      is_safe_attempt_metadata: { Args: { value: Json }; Returns: boolean }
      list_class_invitations: {
        Args: { target_class_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          invitation_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      purge_closed_invitation_personal_data: { Args: never; Returns: number }
    }
    Enums: {
      account_status: "pending" | "active" | "blocked"
      admin_audit_action:
        | "administrator_granted"
        | "administrator_revoked"
        | "membership_revoked"
        | "account_deactivation_requested"
        | "class_archived"
      administrator_status: "active" | "revoked"
      app_role: "participant" | "monitor"
      assignment_status: "scheduled" | "active" | "archived"
      attempt_event_type:
        | "attempt_started"
        | "attempt_resumed"
        | "step_viewed"
        | "action_succeeded"
        | "action_failed"
        | "hint_requested"
        | "audio_started"
        | "audio_completed"
        | "voice_response_started"
        | "voice_response_completed"
        | "help_requested"
        | "attempt_completed"
        | "attempt_abandoned"
      attempt_status: "in_progress" | "completed" | "abandoned"
      class_status: "active" | "archived"
      help_request_status: "open" | "in_progress" | "resolved" | "cancelled"
      membership_status: "active" | "inactive"
      mission_catalog_status: "active" | "archived"
      mission_difficulty: "easy" | "medium" | "hard"
      mission_step_type:
        | "instruction"
        | "tap_target"
        | "multiple_choice"
        | "confirmation"
        | "simulation"
      mission_version_status: "draft" | "published" | "retired"
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
      account_status: ["pending", "active", "blocked"],
      admin_audit_action: [
        "administrator_granted",
        "administrator_revoked",
        "membership_revoked",
        "account_deactivation_requested",
        "class_archived",
      ],
      administrator_status: ["active", "revoked"],
      app_role: ["participant", "monitor"],
      assignment_status: ["scheduled", "active", "archived"],
      attempt_event_type: [
        "attempt_started",
        "attempt_resumed",
        "step_viewed",
        "action_succeeded",
        "action_failed",
        "hint_requested",
        "audio_started",
        "audio_completed",
        "voice_response_started",
        "voice_response_completed",
        "help_requested",
        "attempt_completed",
        "attempt_abandoned",
      ],
      attempt_status: ["in_progress", "completed", "abandoned"],
      class_status: ["active", "archived"],
      help_request_status: ["open", "in_progress", "resolved", "cancelled"],
      membership_status: ["active", "inactive"],
      mission_catalog_status: ["active", "archived"],
      mission_difficulty: ["easy", "medium", "hard"],
      mission_step_type: [
        "instruction",
        "tap_target",
        "multiple_choice",
        "confirmation",
        "simulation",
      ],
      mission_version_status: ["draft", "published", "retired"],
    },
  },
} as const
