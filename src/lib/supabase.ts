import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          created_at?: string
        }
      }
      circles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          invite_code: string
          created_at: string
          invite_code_rotated_at?: string | null
          invite_code_rotated_by?: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          invite_code: string
          created_at?: string
          invite_code_rotated_at?: string | null
          invite_code_rotated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          invite_code?: string
          created_at?: string
          invite_code_rotated_at?: string | null
          invite_code_rotated_by?: string | null
        }
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: 'admin' | 'member'
          status: 'pending' | 'approved'
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'approved'
          joined_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'approved'
          joined_at?: string
        }
      }
      playdates: {
        Row: {
          id: string
          circle_id: string
          created_by: string
          title: string
          description: string | null
          location_name: string | null
          location_address: string | null
          lat: number | null
          lng: number | null
          start_time: string
          end_time: string
          capacity: number
          status: 'draft' | 'published' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          created_by: string
          title: string
          description?: string | null
          location_name?: string | null
          location_address?: string | null
          lat?: number | null
          lng?: number | null
          start_time: string
          end_time: string
          capacity: number
          status?: 'draft' | 'published' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          created_by?: string
          title?: string
          description?: string | null
          location_name?: string | null
          location_address?: string | null
          lat?: number | null
          lng?: number | null
          start_time?: string
          end_time?: string
          capacity?: number
          status?: 'draft' | 'published' | 'cancelled'
          created_at?: string
        }
      }
      playdate_participants: {
        Row: {
          id: string
          playdate_id: string
          user_id: string
          num_children: number
          status: 'interested' | 'confirmed' | 'declined'
          created_at: string
        }
        Insert: {
          id?: string
          playdate_id: string
          user_id: string
          num_children: number
          status?: 'interested' | 'confirmed' | 'declined'
          created_at?: string
        }
        Update: {
          id?: string
          playdate_id?: string
          user_id?: string
          num_children?: number
          status?: 'interested' | 'confirmed' | 'declined'
          created_at?: string
        }
      }
      ,
      children: {
        Row: {
          id: string
          user_id: string
          full_name: string
          birthdate: string | null
          allergies: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          birthdate?: string | null
          allergies?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          birthdate?: string | null
          allergies?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      ,
      playdate_child_participants: {
        Row: {
          id: string
          playdate_id: string
          child_id: string
          rsvp: 'yes' | 'no' | 'maybe' | 'pending'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          playdate_id: string
          child_id: string
          rsvp?: 'yes' | 'no' | 'maybe' | 'pending'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          playdate_id?: string
          child_id?: string
          rsvp?: 'yes' | 'no' | 'maybe' | 'pending'
          notes?: string | null
          created_at?: string
        }
      }
      availability_slots: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring: boolean
          specific_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring: boolean
          specific_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_recurring?: boolean
          specific_date?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          circle_id: string | null
          playdate_id: string | null
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          circle_id?: string | null
          playdate_id?: string | null
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          circle_id?: string | null
          playdate_id?: string | null
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          circle_id: string
          name: string
          address: string
          lat: number
          lng: number
          description: string | null
          created_by: string
        }
        Insert: {
          id?: string
          circle_id: string
          name: string
          address: string
          lat: number
          lng: number
          description?: string | null
          created_by: string
        }
        Update: {
          id?: string
          circle_id?: string
          name?: string
          address?: string
          lat?: number
          lng?: number
          description?: string | null
          created_by?: string
        }
      }
    }
  }
}
