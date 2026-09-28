
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "occupation_details": {
                  Row: {
                    "onet_code": string,"skills": NonNullable<Json>,"tasks": NonNullable<Json>
                  }
                  Insert: {
                    "onet_code": string,"skills"?: NonNullable<Json>,"tasks"?: NonNullable<Json>
                  }
                  Update: {
                    "onet_code"?: string,"skills"?: NonNullable<Json>,"tasks"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_details_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: true
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    }
                  ]
                },"occupation_outlook": {
                  Row: {
                    "annual_high": number | null,"annual_low": number | null,"annual_median": number | null,"bright_reasons": (string)[],"hourly_high": number | null,"hourly_low": number | null,"hourly_median": number | null,"onet_code": string,"or_more": (string)[],"outlook": string,"retrieved_at": string,"source_id": string,"wage_soc_code": string | null
                  }
                  Insert: {
                    "annual_high"?: number | null,"annual_low"?: number | null,"annual_median"?: number | null,"bright_reasons"?: (string)[],"hourly_high"?: number | null,"hourly_low"?: number | null,"hourly_median"?: number | null,"onet_code": string,"or_more"?: (string)[],"outlook": string,"retrieved_at": string,"source_id"?: string,"wage_soc_code"?: string | null
                  }
                  Update: {
                    "annual_high"?: number | null,"annual_low"?: number | null,"annual_median"?: number | null,"bright_reasons"?: (string)[],"hourly_high"?: number | null,"hourly_low"?: number | null,"hourly_median"?: number | null,"onet_code"?: string,"or_more"?: (string)[],"outlook"?: string,"retrieved_at"?: string,"source_id"?: string,"wage_soc_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_outlook_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: true
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    },{
      foreignKeyName: "occupation_outlook_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"occupation_related": {
                  Row: {
                    "onet_code": string,"rank": number,"related_code": string,"tier": string
                  }
                  Insert: {
                    "onet_code": string,"rank": number,"related_code": string,"tier": string
                  }
                  Update: {
                    "onet_code"?: string,"rank"?: number,"related_code"?: string,"tier"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_related_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    },{
      foreignKeyName: "occupation_related_related_code_fkey"
      columns: ["related_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    }
                  ]
                },"occupation_titles": {
                  Row: {
                    "featured": boolean,"kind": string,"onet_code": string,"title": string
                  }
                  Insert: {
                    "featured"?: boolean,"kind": string,"onet_code": string,"title": string
                  }
                  Update: {
                    "featured"?: boolean,"kind"?: string,"onet_code"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_titles_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    }
                  ]
                },"occupations": {
                  Row: {
                    "description": string,"education_level": number | null,"education_share": number | null,"job_zone": number | null,"onet_code": string,"onet_release": string,"retired_at": string | null,"retrieved_at": string,"soc_code": string | null,"source_id": string,"title": string
                  }
                  Insert: {
                    "description": string,"education_level"?: number | null,"education_share"?: number | null,"job_zone"?: number | null,"onet_code": string,"onet_release": string,"retired_at"?: string | null,"retrieved_at": string,"soc_code"?: never,"source_id"?: string,"title": string
                  }
                  Update: {
                    "description"?: string,"education_level"?: number | null,"education_share"?: number | null,"job_zone"?: number | null,"onet_code"?: string,"onet_release"?: string,"retired_at"?: string | null,"retrieved_at"?: string,"soc_code"?: never,"source_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "age_confirmed": boolean,"created_at": string,"grad_year": number | null,"id": string,"nickname": string | null,"stage": string | null,"state": string | null,"updated_at": string
                  }
                  Insert: {
                    "age_confirmed": boolean,"created_at"?: string,"grad_year"?: number | null,"id": string,"nickname"?: string | null,"stage"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "age_confirmed"?: boolean,"created_at"?: string,"grad_year"?: number | null,"id"?: string,"nickname"?: string | null,"stage"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_items": {
                  Row: {
                    "created_at": string,"id": string,"onet_code": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"onet_code"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"onet_code"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_items_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    }
                  ]
                },"sources": {
                  Row: {
                    "allowed": boolean,"attribution": string,"homepage": string,"id": string,"kind": string,"last_etag": string | null,"last_release": string | null,"last_success_at": string | null,"name": string,"paused_reason": string | null,"refresh_interval": string,"terms_checked_at": string | null,"terms_url": string | null
                  }
                  Insert: {
                    "allowed"?: boolean,"attribution": string,"homepage": string,"id": string,"kind": string,"last_etag"?: string | null,"last_release"?: string | null,"last_success_at"?: string | null,"name": string,"paused_reason"?: string | null,"refresh_interval": string,"terms_checked_at"?: string | null,"terms_url"?: string | null
                  }
                  Update: {
                    "allowed"?: boolean,"attribution"?: string,"homepage"?: string,"id"?: string,"kind"?: string,"last_etag"?: string | null,"last_release"?: string | null,"last_success_at"?: string | null,"name"?: string,"paused_reason"?: string | null,"refresh_interval"?: string,"terms_checked_at"?: string | null,"terms_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"search_occupations":
{ Args: { "p_query": string }; Returns: {
              "education_level": number,"job_zone": number,"matched_title": string,"onet_code": string,"title": string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

