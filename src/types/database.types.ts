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
      Courses: {
        Row: {
          code: number | null
          created_at: string
          duration: number | null
          enabled: boolean | null
          id: string
          name: string | null
          price: number | null
          total_lessons: number | null
        }
        Insert: {
          code?: number | null
          created_at?: string
          duration?: number | null
          enabled?: boolean | null
          id?: string
          name?: string | null
          price?: number | null
          total_lessons?: number | null
        }
        Update: {
          code?: number | null
          created_at?: string
          duration?: number | null
          enabled?: boolean | null
          id?: string
          name?: string | null
          price?: number | null
          total_lessons?: number | null
        }
        Relationships: []
      }
      Enrolment: {
        Row: {
          course_id: string | null
          created_at: string
          enabled: boolean | null
          end_date: string | null
          id: number
          learner_id: string | null
          payment_status: boolean | null
          start_date: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          enabled?: boolean | null
          end_date?: string | null
          id?: number
          learner_id?: string | null
          payment_status?: boolean | null
          start_date?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          enabled?: boolean | null
          end_date?: string | null
          id?: number
          learner_id?: string | null
          payment_status?: boolean | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Enrolment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "Courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Enrolment_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "Learner"
            referencedColumns: ["id"]
          },
        ]
      }
      Instructor: {
        Row: {
          areas: string[]
          car_license: string | null
          car_make: string | null
          car_mode: string | null
          car_number: string | null
          created_at: string
          DL_number: string | null
          email: string | null
          enabled: boolean | null
          experience: number | null
          id_instructor: string
          name: string | null
          password: string | null
          phone: string | null
          signed_up: string | null
        }
        Insert: {
          areas?: string[]
          car_license?: string | null
          car_make?: string | null
          car_mode?: string | null
          car_number?: string | null
          created_at?: string
          DL_number?: string | null
          email?: string | null
          enabled?: boolean | null
          experience?: number | null
          id_instructor?: string
          name?: string | null
          password?: string | null
          phone?: string | null
          signed_up?: string | null
        }
        Update: {
          areas?: string[]
          car_license?: string | null
          car_make?: string | null
          car_mode?: string | null
          car_number?: string | null
          created_at?: string
          DL_number?: string | null
          email?: string | null
          enabled?: boolean | null
          experience?: number | null
          id_instructor?: string
          name?: string | null
          password?: string | null
          phone?: string | null
          signed_up?: string | null
        }
        Relationships: []
      }
      "Instructor Unavailability": {
        Row: {
          booked_date: string | null
          booked_end_time: string | null
          booked_start_time: string | null
          instructor_id: string
        }
        Insert: {
          booked_date?: string | null
          booked_end_time?: string | null
          booked_start_time?: string | null
          instructor_id: string
        }
        Update: {
          booked_date?: string | null
          booked_end_time?: string | null
          booked_start_time?: string | null
          instructor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Instructor Unavailability_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: true
            referencedRelation: "Instructor"
            referencedColumns: ["id_instructor"]
          },
        ]
      }
      Learner: {
        Row: {
          aadhar_state: string | null
          address_lat: number | null
          address_lng: number | null
          area: string | null
          city: string | null
          created_at: string
          DL_id: string | null
          DL_result: boolean | null
          DL_test_date: string | null
          dob: string | null
          email: string | null
          enabled: boolean | null
          has_a_DL: boolean | null
          id: string
          LL_application_approved: boolean | null
          LL_application_id: string | null
          LL_result: boolean | null
          LL_team_appointment_booked: boolean | null
          LL_test_date: string | null
          name: string | null
          password: string | null
          phone: string
          pick_up_location: string | null
          pincode: string | null
          signed_up: string | null
          start_date: string | null
          unavailability: Json | null
        }
        Insert: {
          aadhar_state?: string | null
          address_lat?: number | null
          address_lng?: number | null
          area?: string | null
          city?: string | null
          created_at?: string
          DL_id?: string | null
          DL_result?: boolean | null
          DL_test_date?: string | null
          dob?: string | null
          email?: string | null
          enabled?: boolean | null
          has_a_DL?: boolean | null
          id?: string
          LL_application_approved?: boolean | null
          LL_application_id?: string | null
          LL_result?: boolean | null
          LL_team_appointment_booked?: boolean | null
          LL_test_date?: string | null
          name?: string | null
          password?: string | null
          phone: string
          pick_up_location?: string | null
          pincode?: string | null
          signed_up?: string | null
          start_date?: string | null
          unavailability?: Json | null
        }
        Update: {
          aadhar_state?: string | null
          address_lat?: number | null
          address_lng?: number | null
          area?: string | null
          city?: string | null
          created_at?: string
          DL_id?: string | null
          DL_result?: boolean | null
          DL_test_date?: string | null
          dob?: string | null
          email?: string | null
          enabled?: boolean | null
          has_a_DL?: boolean | null
          id?: string
          LL_application_approved?: boolean | null
          LL_application_id?: string | null
          LL_result?: boolean | null
          LL_team_appointment_booked?: boolean | null
          LL_test_date?: string | null
          name?: string | null
          password?: string | null
          phone?: string
          pick_up_location?: string | null
          pincode?: string | null
          signed_up?: string | null
          start_date?: string | null
          unavailability?: Json | null
        }
        Relationships: []
      }
      "Learner Availability": {
        Row: {
          day_of_the_week: string | null
          learner_id: string
          list_of_available_timeslots: Json | null
        }
        Insert: {
          day_of_the_week?: string | null
          learner_id: string
          list_of_available_timeslots?: Json | null
        }
        Update: {
          day_of_the_week?: string | null
          learner_id?: string
          list_of_available_timeslots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "Learner Availability_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: true
            referencedRelation: "Learner"
            referencedColumns: ["id"]
          },
        ]
      }
      Lesson: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          duration: number | null
          enabled: boolean | null
          id: string
          number: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          enabled?: boolean | null
          id?: string
          number?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          enabled?: boolean | null
          id?: string
          number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Lesson_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "Courses"
            referencedColumns: ["id"]
          },
        ]
      }
      Payment: {
        Row: {
          amount: number | null
          created_at: string
          enabled: boolean | null
          id: number
          "⁠learner_id": string | null
          payment_date: string | null
          pmt_ref: string | null
          product: string | null
          "⁠psp_ref": string | null
          status: boolean | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: number
          "⁠learner_id"?: string | null
          payment_date?: string | null
          pmt_ref?: string | null
          product?: string | null
          "⁠psp_ref"?: string | null
          status?: boolean | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: number
          "⁠learner_id"?: string | null
          payment_date?: string | null
          pmt_ref?: string | null
          product?: string | null
          "⁠psp_ref"?: string | null
          status?: boolean | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Payment_⁠learner_id_fkey"
            columns: ["⁠learner_id"]
            isOneToOne: false
            referencedRelation: "Learner"
            referencedColumns: ["id"]
          },
        ]
      }
      Schedule: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          enabled: boolean
          end_time: string
          id: number
          instructor_id: string | null
          learner_id: string | null
          lesson_id: string | null
          otp: string | null
          start_time: string
          status: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          enabled?: boolean
          end_time: string
          id?: number
          instructor_id?: string | null
          learner_id?: string | null
          lesson_id?: string | null
          otp?: string | null
          start_time: string
          status?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          enabled?: boolean
          end_time?: string
          id?: number
          instructor_id?: string | null
          learner_id?: string | null
          lesson_id?: string | null
          otp?: string | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "Courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Schedule_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "Instructor"
            referencedColumns: ["id_instructor"]
          },
          {
            foreignKeyName: "Schedule_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "Learner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Schedule_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_claim: {
        Args: {
          uid: string
          claim: string
        }
        Returns: string
      }
      get_claim: {
        Args: {
          uid: string
          claim: string
        }
        Returns: Json
      }
      get_claims: {
        Args: {
          uid: string
        }
        Returns: Json
      }
      get_my_claim: {
        Args: {
          claim: string
        }
        Returns: Json
      }
      get_my_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_claims_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_claim: {
        Args: {
          uid: string
          claim: string
          value: Json
        }
        Returns: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
