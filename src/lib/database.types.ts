
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
            "ap_courses": {
                  Row: {
                    "code": string,"course_group": string,"name": string
                  }
                  Insert: {
                    "code": string,"course_group": string,"name": string
                  }
                  Update: {
                    "code"?: string,"course_group"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"career_certifications": {
                  Row: {
                    "cert_id": string,"name": string,"onet_code": string,"organization": string | null,"retrieved_at": string,"source_id": string,"url": string | null
                  }
                  Insert: {
                    "cert_id": string,"name": string,"onet_code": string,"organization"?: string | null,"retrieved_at"?: string,"source_id"?: string,"url"?: string | null
                  }
                  Update: {
                    "cert_id"?: string,"name"?: string,"onet_code"?: string,"organization"?: string | null,"retrieved_at"?: string,"source_id"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "career_certifications_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    },{
      foreignKeyName: "career_certifications_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"career_licenses": {
                  Row: {
                    "agency": string | null,"agency_url": string | null,"license_id": string,"onet_code": string,"retrieved_at": string,"source_id": string,"state": string,"title": string
                  }
                  Insert: {
                    "agency"?: string | null,"agency_url"?: string | null,"license_id": string,"onet_code": string,"retrieved_at"?: string,"source_id"?: string,"state": string,"title": string
                  }
                  Update: {
                    "agency"?: string | null,"agency_url"?: string | null,"license_id"?: string,"onet_code"?: string,"retrieved_at"?: string,"source_id"?: string,"state"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "career_licenses_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    },{
      foreignKeyName: "career_licenses_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"eligibility_profiles": {
                  Row: {
                    "citizenship": string | null,"consent_version": number,"consented_at": string,"first_generation": string | null,"gpa": number | null,"intended_fields": (string)[] | null,"military_family": string | null,"plans_fafsa": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "citizenship"?: string | null,"consent_version": number,"consented_at"?: string,"first_generation"?: string | null,"gpa"?: number | null,"intended_fields"?: (string)[] | null,"military_family"?: string | null,"plans_fafsa"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "citizenship"?: string | null,"consent_version"?: number,"consented_at"?: string,"first_generation"?: string | null,"gpa"?: number | null,"intended_fields"?: (string)[] | null,"military_family"?: string | null,"plans_fafsa"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"institutions": {
                  Row: {
                    "act_25": number | null,"act_75": number | null,"admission_rate": number | null,"city": string | null,"graduation_rate": number | null,"locale": string | null,"name": string,"net_price": number | null,"net_price_by_income": (number)[] | null,"ownership": string | null,"retrieved_at": string,"sat_math_25": number | null,"sat_math_75": number | null,"sat_read_25": number | null,"sat_read_75": number | null,"serves": (string)[] | null,"source_id": string,"state": string | null,"students": number | null,"test_policy": string | null,"two_year": boolean | null,"unitid": number,"website": string | null
                  }
                  Insert: {
                    "act_25"?: number | null,"act_75"?: number | null,"admission_rate"?: number | null,"city"?: string | null,"graduation_rate"?: number | null,"locale"?: string | null,"name": string,"net_price"?: number | null,"net_price_by_income"?: (number)[] | null,"ownership"?: string | null,"retrieved_at": string,"sat_math_25"?: number | null,"sat_math_75"?: number | null,"sat_read_25"?: number | null,"sat_read_75"?: number | null,"serves"?: (string)[] | null,"source_id"?: string,"state"?: string | null,"students"?: number | null,"test_policy"?: string | null,"two_year"?: boolean | null,"unitid": number,"website"?: string | null
                  }
                  Update: {
                    "act_25"?: number | null,"act_75"?: number | null,"admission_rate"?: number | null,"city"?: string | null,"graduation_rate"?: number | null,"locale"?: string | null,"name"?: string,"net_price"?: number | null,"net_price_by_income"?: (number)[] | null,"ownership"?: string | null,"retrieved_at"?: string,"sat_math_25"?: number | null,"sat_math_75"?: number | null,"sat_read_25"?: number | null,"sat_read_75"?: number | null,"serves"?: (string)[] | null,"source_id"?: string,"state"?: string | null,"students"?: number | null,"test_policy"?: string | null,"two_year"?: boolean | null,"unitid"?: number,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "institutions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"interest_questions": {
                  Row: {
                    "area": string,"index": number,"retrieved_at": string,"source_id": string,"text": string
                  }
                  Insert: {
                    "area": string,"index": number,"retrieved_at": string,"source_id"?: string,"text": string
                  }
                  Update: {
                    "area"?: string,"index"?: number,"retrieved_at"?: string,"source_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "interest_questions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"interest_results": {
                  Row: {
                    "artistic": number,"conventional": number,"enterprising": number,"investigative": number,"realistic": number,"social": number,"taken_at": string,"user_id": string
                  }
                  Insert: {
                    "artistic": number,"conventional": number,"enterprising": number,"investigative": number,"realistic": number,"social": number,"taken_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "artistic"?: number,"conventional"?: number,"enterprising"?: number,"investigative"?: number,"realistic"?: number,"social"?: number,"taken_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"knowledge_ap_map": {
                  Row: {
                    "ap_code": string,"area_id": string
                  }
                  Insert: {
                    "ap_code": string,"area_id": string
                  }
                  Update: {
                    "ap_code"?: string,"area_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_ap_map_ap_code_fkey"
      columns: ["ap_code"]
isOneToOne: false
      referencedRelation: "ap_courses"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "knowledge_ap_map_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "knowledge_areas"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_areas": {
                  Row: {
                    "id": string,"name": string
                  }
                  Insert: {
                    "id": string,"name": string
                  }
                  Update: {
                    "id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"occupation_details": {
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
                },"occupation_knowledge": {
                  Row: {
                    "area_id": string,"importance": number,"onet_code": string
                  }
                  Insert: {
                    "area_id": string,"importance": number,"onet_code": string
                  }
                  Update: {
                    "area_id"?: string,"importance"?: number,"onet_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_knowledge_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "knowledge_areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "occupation_knowledge_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
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
                },"occupation_programs": {
                  Row: {
                    "cip_title": string,"cip4": string | null,"cip6": string,"onet_code": string
                  }
                  Insert: {
                    "cip_title": string,"cip4"?: never,"cip6": string,"onet_code": string
                  }
                  Update: {
                    "cip_title"?: string,"cip4"?: never,"cip6"?: string,"onet_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupation_programs_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
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
                    "description": string,"education_level": number | null,"education_share": number | null,"interest_artistic": number | null,"interest_conventional": number | null,"interest_enterprising": number | null,"interest_investigative": number | null,"interest_realistic": number | null,"interest_social": number | null,"job_zone": number | null,"onet_code": string,"onet_release": string,"retired_at": string | null,"retrieved_at": string,"soc_code": string | null,"source_id": string,"title": string
                  }
                  Insert: {
                    "description": string,"education_level"?: number | null,"education_share"?: number | null,"interest_artistic"?: number | null,"interest_conventional"?: number | null,"interest_enterprising"?: number | null,"interest_investigative"?: number | null,"interest_realistic"?: number | null,"interest_social"?: number | null,"job_zone"?: number | null,"onet_code": string,"onet_release": string,"retired_at"?: string | null,"retrieved_at": string,"soc_code"?: never,"source_id"?: string,"title": string
                  }
                  Update: {
                    "description"?: string,"education_level"?: number | null,"education_share"?: number | null,"interest_artistic"?: number | null,"interest_conventional"?: number | null,"interest_enterprising"?: number | null,"interest_investigative"?: number | null,"interest_realistic"?: number | null,"interest_social"?: number | null,"job_zone"?: number | null,"onet_code"?: string,"onet_release"?: string,"retired_at"?: string | null,"retrieved_at"?: string,"soc_code"?: never,"source_id"?: string,"title"?: string
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
                },"opportunities": {
                  Row: {
                    "closes_on": string,"id": string,"organization": string,"pay_interval": string | null,"pay_max": number | null,"pay_min": number | null,"places": (string)[],"remote": boolean,"retrieved_at": string,"source_id": string,"states": (string)[],"summary": string | null,"title": string,"url": string,"who_may_apply": string | null
                  }
                  Insert: {
                    "closes_on": string,"id": string,"organization": string,"pay_interval"?: string | null,"pay_max"?: number | null,"pay_min"?: number | null,"places"?: (string)[],"remote"?: boolean,"retrieved_at": string,"source_id"?: string,"states"?: (string)[],"summary"?: string | null,"title": string,"url": string,"who_may_apply"?: string | null
                  }
                  Update: {
                    "closes_on"?: string,"id"?: string,"organization"?: string,"pay_interval"?: string | null,"pay_max"?: number | null,"pay_min"?: number | null,"places"?: (string)[],"remote"?: boolean,"retrieved_at"?: string,"source_id"?: string,"states"?: (string)[],"summary"?: string | null,"title"?: string,"url"?: string,"who_may_apply"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_items": {
                  Row: {
                    "academic_year": number | null,"created_at": string,"done": boolean,"due_on": string | null,"id": string,"kind": string,"term": string,"title": string,"user_id": string
                  }
                  Insert: {
                    "academic_year"?: number | null,"created_at"?: string,"done"?: boolean,"due_on"?: string | null,"id"?: string,"kind"?: string,"term"?: string,"title": string,"user_id"?: string
                  }
                  Update: {
                    "academic_year"?: number | null,"created_at"?: string,"done"?: boolean,"due_on"?: string | null,"id"?: string,"kind"?: string,"term"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
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
                },"programs": {
                  Row: {
                    "cip4": string,"credential_level": number,"credential_title": string,"earnings_1yr": number | null,"earnings_4yr": number | null,"graduates": number | null,"id": number,"median_debt": number | null,"title": string,"unitid": number
                  }
                  Insert: {
                    "cip4": string,"credential_level": number,"credential_title": string,"earnings_1yr"?: number | null,"earnings_4yr"?: number | null,"graduates"?: number | null,"id"?: never,"median_debt"?: number | null,"title": string,"unitid": number
                  }
                  Update: {
                    "cip4"?: string,"credential_level"?: number,"credential_title"?: string,"earnings_1yr"?: number | null,"earnings_4yr"?: number | null,"graduates"?: number | null,"id"?: never,"median_debt"?: number | null,"title"?: string,"unitid"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_unitid_fkey"
      columns: ["unitid"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["unitid"]
    }
                  ]
                },"saved_items": {
                  Row: {
                    "ap_course_code": string | null,"created_at": string,"id": string,"onet_code": string | null,"opportunity_id": string | null,"scholarship_id": string | null,"student_program_id": string | null,"title": string | null,"unitid": number | null,"user_id": string
                  }
                  Insert: {
                    "ap_course_code"?: string | null,"created_at"?: string,"id"?: string,"onet_code"?: string | null,"opportunity_id"?: string | null,"scholarship_id"?: string | null,"student_program_id"?: string | null,"title"?: string | null,"unitid"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "ap_course_code"?: string | null,"created_at"?: string,"id"?: string,"onet_code"?: string | null,"opportunity_id"?: string | null,"scholarship_id"?: string | null,"student_program_id"?: string | null,"title"?: string | null,"unitid"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_items_ap_course_code_fkey"
      columns: ["ap_course_code"]
isOneToOne: false
      referencedRelation: "ap_courses"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "saved_items_onet_code_fkey"
      columns: ["onet_code"]
isOneToOne: false
      referencedRelation: "occupations"
      referencedColumns: ["onet_code"]
    }
                  ]
                },"scholarships": {
                  Row: {
                    "award_max": number | null,"award_min": number | null,"award_text": string | null,"checked_at": string,"citizenship": string | null,"deadline_date": string | null,"deadline_kind": string,"deadline_month_day": string | null,"description": string,"fields": (string)[],"first_generation": boolean,"id": string,"military_family": boolean,"min_gpa": number | null,"needs_fafsa": boolean,"other_requirements": string | null,"retrieved_at": string,"source_id": string,"sponsor": string,"sponsor_type": string,"stages": (string)[],"state": string | null,"title": string,"url": string
                  }
                  Insert: {
                    "award_max"?: number | null,"award_min"?: number | null,"award_text"?: string | null,"checked_at": string,"citizenship"?: string | null,"deadline_date"?: string | null,"deadline_kind": string,"deadline_month_day"?: string | null,"description": string,"fields"?: (string)[],"first_generation"?: boolean,"id": string,"military_family"?: boolean,"min_gpa"?: number | null,"needs_fafsa"?: boolean,"other_requirements"?: string | null,"retrieved_at": string,"source_id"?: string,"sponsor": string,"sponsor_type": string,"stages": (string)[],"state"?: string | null,"title": string,"url": string
                  }
                  Update: {
                    "award_max"?: number | null,"award_min"?: number | null,"award_text"?: string | null,"checked_at"?: string,"citizenship"?: string | null,"deadline_date"?: string | null,"deadline_kind"?: string,"deadline_month_day"?: string | null,"description"?: string,"fields"?: (string)[],"first_generation"?: boolean,"id"?: string,"military_family"?: boolean,"min_gpa"?: number | null,"needs_fafsa"?: boolean,"other_requirements"?: string | null,"retrieved_at"?: string,"source_id"?: string,"sponsor"?: string,"sponsor_type"?: string,"stages"?: (string)[],"state"?: string | null,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scholarships_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
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
                },"student_programs": {
                  Row: {
                    "checked_at": string,"deadline_date": string | null,"deadline_kind": string,"deadline_month_day": string | null,"description": string,"id": string,"kind": string,"paid": boolean,"pay_text": string | null,"remote": boolean,"retrieved_at": string,"source_id": string,"sponsor": string,"sponsor_type": string,"stages": (string)[],"states": (string)[],"title": string,"url": string,"who_text": string | null
                  }
                  Insert: {
                    "checked_at": string,"deadline_date"?: string | null,"deadline_kind": string,"deadline_month_day"?: string | null,"description": string,"id": string,"kind": string,"paid": boolean,"pay_text"?: string | null,"remote"?: boolean,"retrieved_at": string,"source_id"?: string,"sponsor": string,"sponsor_type": string,"stages": (string)[],"states"?: (string)[],"title": string,"url": string,"who_text"?: string | null
                  }
                  Update: {
                    "checked_at"?: string,"deadline_date"?: string | null,"deadline_kind"?: string,"deadline_month_day"?: string | null,"description"?: string,"id"?: string,"kind"?: string,"paid"?: boolean,"pay_text"?: string | null,"remote"?: boolean,"retrieved_at"?: string,"source_id"?: string,"sponsor"?: string,"sponsor_type"?: string,"stages"?: (string)[],"states"?: (string)[],"title"?: string,"url"?: string,"who_text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_programs_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"youth_programs": {
                  Row: {
                    "city": string | null,"id": string,"name": string,"retrieved_at": string,"source_id": string,"state": string,"website": string | null,"zip": string | null
                  }
                  Insert: {
                    "city"?: string | null,"id": string,"name": string,"retrieved_at"?: string,"source_id"?: string,"state": string,"website"?: string | null,"zip"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"id"?: string,"name"?: string,"retrieved_at"?: string,"source_id"?: string,"state"?: string,"website"?: string | null,"zip"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "youth_programs_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ap_courses_for_career":
{ Args: { "p_onet_code": string }; Returns: {
              "ap_code": string,"ap_name": string,"area_name": string,"importance": number
            }[]
                           },
"colleges_for_career":
{ Args: { "p_level"?: string,"p_onet_code": string,"p_state"?: string }; Returns: {
              "city": string,"college": string,"credential_level": number,"credential_title": string,"earnings_1yr": number,"earnings_4yr": number,"graduation_rate": number,"median_debt": number,"net_price": number,"ownership": string,"program": string,"program_id": number,"state": string,"unitid": number,"website": string
            }[]
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"match_careers":
{ Args: { "p_artistic": number,"p_conventional": number,"p_enterprising": number,"p_investigative": number,"p_realistic": number,"p_social": number,"p_zone"?: number }; Returns: {
              "education_level": number,"fit": number,"job_zone": number,"onet_code": string,"title": string
            }[]
                           },
"match_scholarships":
{ Args: { "p_stage"?: string,"p_state"?: string }; Returns: {
              "award_max": number,"award_min": number,"award_text": string,"checked_at": string,"deadline_date": string,"deadline_kind": string,"deadline_month_day": string,"description": string,"fields": (string)[],"id": string,"match": string,"sponsor": string,"sponsor_type": string,"title": string,"to_check": (string)[],"url": string
            }[]
                           },
"search_colleges":
{ Args: { "p_admit"?: string,"p_bracket"?: number,"p_locale"?: string,"p_max_price"?: number,"p_name"?: string,"p_ownership"?: string,"p_page"?: number,"p_program"?: string,"p_serves"?: string,"p_size"?: string,"p_sort"?: string,"p_state"?: string,"p_test_optional"?: boolean,"p_two_year"?: boolean }; Returns: {
              "act_25": number,"act_75": number,"admission_rate": number,"city": string,"graduation_rate": number,"name": string,"ownership": string,"price": number,"sat_math_25": number,"sat_math_75": number,"sat_read_25": number,"sat_read_75": number,"state": string,"students": number,"test_policy": string,"total": number,"unitid": number
            }[]
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
