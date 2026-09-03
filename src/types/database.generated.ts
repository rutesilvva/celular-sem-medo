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
      ai_generation_usage: {
        Row: {
          request_count: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          request_count: number
          user_id: string
          window_started_at: string
        }
        Update: {
          request_count?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
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
            foreignKeyName: "class_mission_assignments_assigned_by_profile_fk"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      daily_mission_choices: {
        Row: {
          assignment_id: string
          choice_date: string
          created_at: string
          participant_id: string
          reason_code: string
        }
        Insert: {
          assignment_id: string
          choice_date?: string
          created_at?: string
          participant_id: string
          reason_code: string
        }
        Update: {
          assignment_id?: string
          choice_date?: string
          created_at?: string
          participant_id?: string
          reason_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_mission_choices_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_mission_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_mission_choices_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_request_history: {
        Row: {
          actor_id: string
          from_status: Database["public"]["Enums"]["help_request_status"] | null
          help_request_id: string
          id: number
          occurred_at: string
          resolution_code: string | null
          to_status: Database["public"]["Enums"]["help_request_status"]
        }
        Insert: {
          actor_id: string
          from_status?:
            | Database["public"]["Enums"]["help_request_status"]
            | null
          help_request_id: string
          id?: never
          occurred_at?: string
          resolution_code?: string | null
          to_status: Database["public"]["Enums"]["help_request_status"]
        }
        Update: {
          actor_id?: string
          from_status?:
            | Database["public"]["Enums"]["help_request_status"]
            | null
          help_request_id?: string
          id?: never
          occurred_at?: string
          resolution_code?: string | null
          to_status?: Database["public"]["Enums"]["help_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "help_request_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_request_history_help_request_id_fkey"
            columns: ["help_request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          acknowledged_at: string | null
          assigned_admin_id: string | null
          assigned_admin_role: Database["public"]["Enums"]["app_role"]
          attempt_id: string | null
          class_id: string
          created_at: string
          id: string
          message: string | null
          mission_version_id: string | null
          participant_id: string
          participant_role: Database["public"]["Enums"]["app_role"]
          reason_code: string
          requested_at: string
          resolution_code: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["help_request_status"]
          step_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_admin_id?: string | null
          assigned_admin_role?: Database["public"]["Enums"]["app_role"]
          attempt_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          message?: string | null
          mission_version_id?: string | null
          participant_id: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          reason_code?: string
          requested_at?: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["help_request_status"]
          step_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_admin_id?: string | null
          assigned_admin_role?: Database["public"]["Enums"]["app_role"]
          attempt_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          message?: string | null
          mission_version_id?: string | null
          participant_id?: string
          participant_role?: Database["public"]["Enums"]["app_role"]
          reason_code?: string
          requested_at?: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["help_request_status"]
          step_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_assigned_admin_profile_fk_v2"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      learning_diagnostics: {
        Row: {
          category_confidence: Json
          created_at: string
          experience_level: string
          goals: string[]
          id: string
          participant_id: string
          preferred_format: string
          updated_at: string
        }
        Insert: {
          category_confidence: Json
          created_at?: string
          experience_level: string
          goals: string[]
          id: string
          participant_id: string
          preferred_format: string
          updated_at?: string
        }
        Update: {
          category_confidence?: Json
          created_at?: string
          experience_level?: string
          goals?: string[]
          id?: string
          participant_id?: string
          preferred_format?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_diagnostics_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_requests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          normalized_query: string
          participant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id: string
          normalized_query: string
          participant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          normalized_query?: string
          participant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_requests_participant_id_fkey"
            columns: ["participant_id"]
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
      mission_review_schedules: {
        Row: {
          assignment_id: string
          completed_count: number
          interval_days: number
          last_completed_at: string
          next_review_at: string
          participant_id: string
          reason_code: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_count: number
          interval_days: number
          last_completed_at: string
          next_review_at: string
          participant_id: string
          reason_code: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_count?: number
          interval_days?: number
          last_completed_at?: string
          next_review_at?: string
          participant_id?: string
          reason_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_review_schedules_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_mission_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_review_schedules_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_self_assessments: {
        Row: {
          assignment_id: string
          attempt_id: string | null
          completed_at: string | null
          confidence_after: number | null
          confidence_before: number
          created_at: string
          id: string
          participant_id: string
        }
        Insert: {
          assignment_id: string
          attempt_id?: string | null
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before: number
          created_at?: string
          id: string
          participant_id: string
        }
        Update: {
          assignment_id?: string
          attempt_id?: string | null
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number
          created_at?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_self_assessments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_mission_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_self_assessments_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_self_assessments_participant_id_fkey"
            columns: ["participant_id"]
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
          safety_note: string
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
          safety_note?: string
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
          safety_note?: string
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
          haptic_feedback: boolean
          high_contrast: boolean
          larger_text: boolean
          locale: string
          onboarding_completed_at: string | null
          reduce_motion: boolean
          repeat_instructions: boolean
          updated_at: string
          user_id: string
          voice_response: boolean
        }
        Insert: {
          audio_rate?: number
          auto_audio?: boolean
          created_at?: string
          haptic_feedback?: boolean
          high_contrast?: boolean
          larger_text?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          reduce_motion?: boolean
          repeat_instructions?: boolean
          updated_at?: string
          user_id: string
          voice_response?: boolean
        }
        Update: {
          audio_rate?: number
          auto_audio?: boolean
          created_at?: string
          haptic_feedback?: boolean
          high_contrast?: boolean
          larger_text?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          reduce_motion?: boolean
          repeat_instructions?: boolean
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
      push_devices: {
        Row: {
          created_at: string
          enabled: boolean
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expo_push_token: string
          id?: string
          last_seen_at?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_outbox: {
        Row: {
          attempts: number
          body: string
          created_at: string
          event_type: string
          help_request_id: string
          id: number
          last_error: string | null
          processed_at: string | null
          recipient_id: string
          route: string
          title: string
        }
        Insert: {
          attempts?: number
          body?: string
          created_at?: string
          event_type: string
          help_request_id: string
          id?: never
          last_error?: string | null
          processed_at?: string | null
          recipient_id: string
          route: string
          title?: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          event_type?: string
          help_request_id?: string
          id?: never
          last_error?: string | null
          processed_at?: string | null
          recipient_id?: string
          route?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_help_request_id_fkey"
            columns: ["help_request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_student: {
        Args: { target_class_id: string; target_user_id: string }
        Returns: boolean
      }
      admin_archive_class: {
        Args: { target_class_id: string }
        Returns: boolean
      }
      admin_create_class: {
        Args: { class_name: string; class_shift?: string; class_slug: string }
        Returns: string
      }
      admin_grant_administrator: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_revoke_administrator: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_revoke_membership: {
        Args: {
          target_class_id: string
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      admin_update_class: {
        Args: {
          class_name: string
          class_shift?: string
          target_class_id: string
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
      can_admin_user: { Args: { target_user_id: string }; Returns: boolean }
      can_administer_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      cancel_my_help_request: {
        Args: { target_help_request_id: string }
        Returns: Database["public"]["Enums"]["help_request_status"]
      }
      complete_mission_self_assessment: {
        Args: {
          rating: number
          target_assessment_id: string
          target_attempt_id: string
        }
        Returns: number
      }
      consume_ai_generation_quota: { Args: never; Returns: boolean }
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
      create_help_request: {
        Args: {
          requested_id: string
          target_attempt_id: string
          target_reason_code?: string
          target_step_id: string
        }
        Returns: {
          help_request_id: string
          request_status: Database["public"]["Enums"]["help_request_status"]
        }[]
      }
      create_learning_request: {
        Args: { query: string; requested_id: string }
        Returns: string
      }
      expire_invitation_secrets: { Args: never; Returns: number }
      get_admin_attempt_event_summaries: {
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
      get_admin_attempt_summaries: {
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
      get_admin_class_contexts: {
        Args: never
        Returns: {
          access_role: string
          class_id: string
          class_name: string
          class_shift: string
          joined_at: string
          membership_id: string
        }[]
      }
      get_admin_class_evolution: {
        Args: { period_days?: number; target_class_id: string }
        Returns: {
          active_participants: number
          activity_date: string
          attempt_count: number
          completed_attempts: number
        }[]
      }
      get_admin_class_participants: {
        Args: { target_class_id: string }
        Returns: {
          assigned_missions: number
          audio_usage_percent: number
          autonomy_percent: number
          avatar_url: string
          average_score: number
          completed_missions: number
          display_name: string
          joined_at: string
          participant_id: string
          progress_percent: number
        }[]
      }
      get_admin_class_progress: {
        Args: { period_days?: number; target_class_id: string }
        Returns: {
          active_participants: number
          assigned_missions: number
          audio_usage_percent: number
          autonomy_percent: number
          completed_missions: number
          completion_percent: number
          difficulty_percent: number
          participant_count: number
        }[]
      }
      get_admin_classes: {
        Args: never
        Returns: {
          class_id: string
          class_name: string
          class_shift: string
          class_slug: string
          class_status: Database["public"]["Enums"]["class_status"]
          created_at: string
          participant_count: number
        }[]
      }
      get_admin_help_requests: {
        Args: { target_class_id: string }
        Returns: {
          acknowledged_at: string
          help_request_id: string
          mission_title: string
          participant_id: string
          participant_name: string
          reason_code: string
          requested_at: string
          resolution_code: string
          resolved_at: string
          status: Database["public"]["Enums"]["help_request_status"]
          step_title: string
        }[]
      }
      get_admin_impact_summary: {
        Args: { target_class_id?: string }
        Returns: {
          autonomous_completions: number
          average_confidence_gain: number
          completed_missions: number
          confidence_responses: number
          open_help_requests: number
          participants: number
          resolved_help_requests: number
        }[]
      }
      get_admin_mission_progress: {
        Args: { period_days?: number; target_class_id: string }
        Returns: {
          assignment_id: string
          audio_usage_percent: number
          autonomy_percent: number
          completed_participants: number
          completion_percent: number
          difficulty_percent: number
          participant_count: number
          title: string
        }[]
      }
      get_admin_participant: {
        Args: { target_class_id: string; target_participant_id: string }
        Returns: {
          assigned_missions: number
          audio_usage_percent: number
          autonomy_percent: number
          avatar_url: string
          average_score: number
          completed_missions: number
          display_name: string
          joined_at: string
          participant_id: string
          progress_percent: number
        }[]
      }
      get_admin_participant_history: {
        Args: {
          period_days?: number
          result_limit?: number
          target_class_id: string
          target_participant_id: string
        }
        Returns: {
          assignment_id: string
          attempt_id: string
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          completed_at: string
          error_count: number
          last_activity_at: string
          mission_title: string
          requested_help: boolean
          started_at: string
          used_audio: boolean
          used_hint: boolean
        }[]
      }
      get_admin_participant_metrics: {
        Args: { period_days?: number; target_class_id: string }
        Returns: {
          assigned_missions: number
          attempt_count: number
          audio_usage_percent: number
          autonomy_percent: number
          avatar_url: string
          average_score: number
          completed_attempt_count: number
          completed_missions: number
          difficulty_percent: number
          display_name: string
          helped_attempt_count: number
          joined_at: string
          last_activity_at: string
          participant_id: string
          progress_percent: number
        }[]
      }
      get_admin_participant_report: {
        Args: {
          period_days?: number
          target_class_id: string
          target_participant_id: string
        }
        Returns: {
          assigned_missions: number
          attempt_count: number
          audio_usage_percent: number
          autonomy_percent: number
          avatar_url: string
          average_score: number
          completed_attempt_count: number
          completed_missions: number
          difficulty_percent: number
          display_name: string
          helped_attempt_count: number
          joined_at: string
          last_activity_at: string
          participant_id: string
          progress_percent: number
        }[]
      }
      get_admin_participants_page: {
        Args: {
          page_offset?: number
          page_size?: number
          period_days?: number
          progress_filter?: string
          search_text?: string
          sort_by?: string
          target_class_id: string
        }
        Returns: {
          assigned_missions: number
          attempt_count: number
          audio_usage_percent: number
          autonomy_percent: number
          avatar_url: string
          average_score: number
          completed_attempt_count: number
          completed_missions: number
          difficulty_percent: number
          display_name: string
          helped_attempt_count: number
          joined_at: string
          last_activity_at: string
          participant_id: string
          progress_percent: number
          total_count: number
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          active_class_count: number
          avatar_url: string
          display_name: string
          email: string
          is_administrator: boolean
          user_id: string
        }[]
      }
      get_admin_workshop_status: {
        Args: { target_class_id: string }
        Returns: {
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          current_mission: string
          current_step: string
          display_name: string
          last_activity_at: string
          open_help_count: number
          participant_id: string
        }[]
      }
      get_help_request_history: {
        Args: { target_help_request_id: string }
        Returns: {
          actor_id: string
          from_status: Database["public"]["Enums"]["help_request_status"]
          history_id: number
          occurred_at: string
          resolution_code: string
          to_status: Database["public"]["Enums"]["help_request_status"]
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
      get_my_class_contexts: {
        Args: never
        Returns: {
          access_role: Database["public"]["Enums"]["app_role"]
          class_id: string
          class_name: string
          class_shift: string
          joined_at: string
          membership_id: string
        }[]
      }
      get_my_daily_mission: {
        Args: never
        Returns: {
          assignment_id: string
          category: string
          daily_reason: string
          estimated_minutes: number
          is_review: boolean
          title: string
        }[]
      }
      get_my_help_requests: {
        Args: never
        Returns: {
          acknowledged_at: string
          help_request_id: string
          mission_title: string
          reason_code: string
          requested_at: string
          resolution_code: string
          resolved_at: string
          status: Database["public"]["Enums"]["help_request_status"]
          step_title: string
        }[]
      }
      get_my_learning_diagnostic: {
        Args: never
        Returns: {
          category_confidence: Json
          diagnostic_id: string
          experience_level: string
          goals: string[]
          preferred_format: string
          updated_at: string
        }[]
      }
      get_my_review_plan: {
        Args: never
        Returns: {
          assignment_id: string
          interval_days: number
          is_due: boolean
          next_review_at: string
          review_reason: string
          title: string
        }[]
      }
      get_participant_category_progress: {
        Args: never
        Returns: {
          assigned_missions: number
          category: string
          class_id: string
          completed_missions: number
          progress_percent: number
        }[]
      }
      get_participant_mission_catalog: {
        Args: never
        Returns: {
          assignment_id: string
          available_from: string
          category: string
          class_id: string
          difficulty: Database["public"]["Enums"]["mission_difficulty"]
          due_at: string
          estimated_minutes: number
          is_required: boolean
          mission_id: string
          mission_version_id: string
          summary: string
          title: string
          version_number: number
        }[]
      }
      get_participant_mission_details: {
        Args: { target_assignment_id: string }
        Returns: {
          assignment_id: string
          category: string
          class_id: string
          difficulty: Database["public"]["Enums"]["mission_difficulty"]
          estimated_minutes: number
          is_required: boolean
          learning_objective: string
          mission_id: string
          mission_version_id: string
          safety_note: string
          step_count: number
          summary: string
          title: string
          version_number: number
        }[]
      }
      get_participant_mission_steps: {
        Args: { target_assignment_id: string }
        Returns: {
          audio_text: string
          expected_action: Json
          hints: Json
          instruction: string
          is_optional: boolean
          mission_version_id: string
          options: Json
          safety_note: string
          step_id: string
          step_position: number
          step_type: Database["public"]["Enums"]["mission_step_type"]
          title: string
        }[]
      }
      get_participant_progress: {
        Args: never
        Returns: {
          assigned_missions: number
          attempt_count: number
          audio_usage_percent: number
          autonomy_percent: number
          class_id: string
          completed_attempt_count: number
          completed_missions: number
          difficulty_percent: number
          latest_assignment_id: string
          latest_completed_at: string
          latest_completion_kind: string
          latest_mission_title: string
          practice_streak_days: number
          progress_percent: number
        }[]
      }
      get_personalized_mission_recommendations: {
        Args: { search_query?: string }
        Returns: {
          assignment_id: string
          category: string
          recommendation_reason: string
          recommendation_score: number
          title: string
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
      is_class_admin: { Args: { target_class_id: string }; Returns: boolean }
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
      register_push_device: {
        Args: { target_platform: string; target_token: string }
        Returns: string
      }
      save_my_learning_diagnostic: {
        Args: {
          requested_id: string
          selected_confidence: Json
          selected_experience: string
          selected_format: string
          selected_goals: string[]
        }
        Returns: string
      }
      set_mission_attempt_progress: {
        Args: {
          mark_completed?: boolean
          target_attempt_id: string
          target_step_id: string
        }
        Returns: Database["public"]["Enums"]["attempt_status"]
      }
      start_mission_self_assessment: {
        Args: {
          rating: number
          requested_id: string
          target_assignment_id: string
        }
        Returns: string
      }
      start_or_resume_mission_attempt: {
        Args: { requested_attempt_id: string; target_assignment_id: string }
        Returns: {
          attempt_id: string
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          current_step_id: string
          mistake_count: number
          next_sequence_number: number
          used_help: boolean
          used_hint: boolean
        }[]
      }
      unregister_push_device: {
        Args: { target_token: string }
        Returns: boolean
      }
      update_help_request: {
        Args: {
          target_help_request_id: string
          target_resolution_code?: string
          target_status: Database["public"]["Enums"]["help_request_status"]
        }
        Returns: Database["public"]["Enums"]["help_request_status"]
      }
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
      app_role: "participant" | "admin"
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
      app_role: ["participant", "admin"],
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
