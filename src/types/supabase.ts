// Auto-generated types for Supabase database schema
// This file defines the database schema types for type-safe queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'department_head' | 'crew'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'department_head' | 'crew'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'department_head' | 'crew'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'pre-production' | 'production' | 'post-production' | 'completed'
          budget: number | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'pre-production' | 'production' | 'post-production' | 'completed'
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'pre-production' | 'production' | 'post-production' | 'completed'
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          assigned_to: string | null
          status: 'todo' | 'in_progress' | 'done'
          priority: 'low' | 'medium' | 'high'
          due_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          assigned_to?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          project_id: string
          scene_number: string | null
          scene_description: string | null
          shoot_date: string
          shoot_time: string | null
          location: string | null
          required_crew: string[] | null
          equipment_needed: string[] | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          scene_number?: string | null
          scene_description?: string | null
          shoot_date: string
          shoot_time?: string | null
          location?: string | null
          required_crew?: string[] | null
          equipment_needed?: string[] | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          scene_number?: string | null
          scene_description?: string | null
          shoot_date?: string
          shoot_time?: string | null
          location?: string | null
          required_crew?: string[] | null
          equipment_needed?: string[] | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          project_id: string
          category: 'equipment' | 'crew' | 'location' | 'post-production' | 'other'
          description: string
          amount: number
          expense_date: string
          receipt_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          category: 'equipment' | 'crew' | 'location' | 'post-production' | 'other'
          description: string
          amount: number
          expense_date: string
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          category?: 'equipment' | 'crew' | 'location' | 'post-production' | 'other'
          description?: string
          amount?: number
          expense_date?: string
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_type: 'script' | 'contract' | 'call_sheet' | 'other' | null
          file_url: string
          file_size: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_type?: 'script' | 'contract' | 'call_sheet' | 'other' | null
          file_url: string
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_type?: 'script' | 'contract' | 'call_sheet' | 'other' | null
          file_url?: string
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { user_id: string; proj_id: string }
        Returns: boolean
      }
      is_project_creator: {
        Args: { user_id: string; proj_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
