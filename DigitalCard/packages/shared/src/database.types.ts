
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
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"meta": NonNullable<Json>
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: number,"meta"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: number,"meta"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"card_events": {
                  Row: {
                    "card_id": string,"created_at": string,"event": string,"id": number,"link_kind": string | null,"viewer_user_id": string | null,"visitor_hash": string
                  }
                  Insert: {
                    "card_id": string,"created_at"?: string,"event": string,"id"?: number,"link_kind"?: string | null,"viewer_user_id"?: string | null,"visitor_hash": string
                  }
                  Update: {
                    "card_id"?: string,"created_at"?: string,"event"?: string,"id"?: number,"link_kind"?: string | null,"viewer_user_id"?: string | null,"visitor_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "public_cards"
      referencedColumns: ["id"]
    }
                  ]
                },"card_links": {
                  Row: {
                    "card_id": string,"id": string,"kind": string,"label": string | null,"sort": number,"url": string
                  }
                  Insert: {
                    "card_id": string,"id"?: string,"kind": string,"label"?: string | null,"sort"?: number,"url": string
                  }
                  Update: {
                    "card_id"?: string,"id"?: string,"kind"?: string,"label"?: string | null,"sort"?: number,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_links_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_links_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "public_cards"
      referencedColumns: ["id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "address": string | null,"avatar_path": string | null,"bio": string | null,"color_scheme": string,"company": string | null,"created_at": string,"deleted_at": string | null,"email": string | null,"first_name": string,"id": string,"is_published": boolean,"last_name": string | null,"logo_path": string | null,"name_format": string,"org_id": string | null,"owner_id": string,"phone": string | null,"slogan": string | null,"slug": string,"template_id": string,"title": string | null,"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "address"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"color_scheme"?: string,"company"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email"?: string | null,"first_name"?: string,"id"?: string,"is_published"?: boolean,"last_name"?: string | null,"logo_path"?: string | null,"name_format"?: string,"org_id"?: string | null,"owner_id": string,"phone"?: string | null,"slogan"?: string | null,"slug": string,"template_id"?: string,"title"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"color_scheme"?: string,"company"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email"?: string | null,"first_name"?: string,"id"?: string,"is_published"?: boolean,"last_name"?: string | null,"logo_path"?: string | null,"name_format"?: string,"org_id"?: string | null,"owner_id"?: string,"phone"?: string | null,"slogan"?: string | null,"slug"?: string,"template_id"?: string,"title"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "card_id": string | null,"company": string | null,"consent_at": string | null,"created_at": string,"email": string | null,"exchange_message": string | null,"follow_up_at": string | null,"id": string,"last_contacted_at": string | null,"met_at": string | null,"met_where_text": string | null,"met_where_type": string | null,"name": string,"note": string | null,"owner_id": string,"phone": string | null,"source": string,"status": string,"tags": (string)[],"title": string | null,"updated_at": string,"via_card_id": string | null,"website": string | null
                  }
                  Insert: {
                    "card_id"?: string | null,"company"?: string | null,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"exchange_message"?: string | null,"follow_up_at"?: string | null,"id"?: string,"last_contacted_at"?: string | null,"met_at"?: string | null,"met_where_text"?: string | null,"met_where_type"?: string | null,"name": string,"note"?: string | null,"owner_id": string,"phone"?: string | null,"source"?: string,"status"?: string,"tags"?: (string)[],"title"?: string | null,"updated_at"?: string,"via_card_id"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "card_id"?: string | null,"company"?: string | null,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"exchange_message"?: string | null,"follow_up_at"?: string | null,"id"?: string,"last_contacted_at"?: string | null,"met_at"?: string | null,"met_where_text"?: string | null,"met_where_type"?: string | null,"name"?: string,"note"?: string | null,"owner_id"?: string,"phone"?: string | null,"source"?: string,"status"?: string,"tags"?: (string)[],"title"?: string | null,"updated_at"?: string,"via_card_id"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "public_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_via_card_id_fkey"
      columns: ["via_card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_via_card_id_fkey"
      columns: ["via_card_id"]
isOneToOne: false
      referencedRelation: "public_cards"
      referencedColumns: ["id"]
    }
                  ]
                },"email_queue": {
                  Row: {
                    "attempts": number,"created_at": string,"dedupe_key": string,"id": number,"kind": string,"payload": NonNullable<Json>,"sent_at": string | null,"status": string,"to_email": string,"user_id": string | null
                  }
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key": string,"id"?: number,"kind": string,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"to_email": string,"user_id"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string,"id"?: number,"kind"?: string,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"to_email"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"org_members": {
                  Row: {
                    "created_at": string,"id": string,"invited_email": string | null,"org_id": string,"role": string,"status": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"invited_email"?: string | null,"org_id": string,"role"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invited_email"?: string | null,"org_id"?: string,"role"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "org_members_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "allow_employee_edit_fields": (string)[],"brand_color": string | null,"created_at": string,"id": string,"locked_template_id": string | null,"logo_path": string | null,"name": string,"owner_id": string
                  }
                  Insert: {
                    "allow_employee_edit_fields"?: (string)[],"brand_color"?: string | null,"created_at"?: string,"id"?: string,"locked_template_id"?: string | null,"logo_path"?: string | null,"name": string,"owner_id": string
                  }
                  Update: {
                    "allow_employee_edit_fields"?: (string)[],"brand_color"?: string | null,"created_at"?: string,"id"?: string,"locked_template_id"?: string | null,"logo_path"?: string | null,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount_mnt": number,"created_at": string,"failure_reason": string | null,"id": string,"paid_amount_mnt": number | null,"paid_at": string | null,"plan_id": string,"qpay_invoice_id": string | null,"qpay_payment_id": string | null,"raw_callback": Json | null,"seats": number,"sender_invoice_no": string,"status": string,"subscription_id": string
                  }
                  Insert: {
                    "amount_mnt": number,"created_at"?: string,"failure_reason"?: string | null,"id"?: string,"paid_amount_mnt"?: number | null,"paid_at"?: string | null,"plan_id": string,"qpay_invoice_id"?: string | null,"qpay_payment_id"?: string | null,"raw_callback"?: Json | null,"seats"?: number,"sender_invoice_no": string,"status"?: string,"subscription_id": string
                  }
                  Update: {
                    "amount_mnt"?: number,"created_at"?: string,"failure_reason"?: string | null,"id"?: string,"paid_amount_mnt"?: number | null,"paid_at"?: string | null,"plan_id"?: string,"qpay_invoice_id"?: string | null,"qpay_payment_id"?: string | null,"raw_callback"?: Json | null,"seats"?: number,"sender_invoice_no"?: string,"status"?: string,"subscription_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "card_limit": number,"contact_limit": number | null,"crm_enabled": boolean,"features": NonNullable<Json>,"id": string,"is_active": boolean,"min_seats": number,"name_en": string,"name_mn": string,"price_mnt": number,"price_per_seat_mnt": number,"seat_limit": number | null
                  }
                  Insert: {
                    "card_limit": number,"contact_limit"?: number | null,"crm_enabled"?: boolean,"features"?: NonNullable<Json>,"id": string,"is_active"?: boolean,"min_seats"?: number,"name_en": string,"name_mn": string,"price_mnt"?: number,"price_per_seat_mnt"?: number,"seat_limit"?: number | null
                  }
                  Update: {
                    "card_limit"?: number,"contact_limit"?: number | null,"crm_enabled"?: boolean,"features"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"min_seats"?: number,"name_en"?: string,"name_mn"?: string,"price_mnt"?: number,"price_per_seat_mnt"?: number,"seat_limit"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"locale": string,"phone": string | null,"role": string,"show_name_to_owners": boolean
                  }
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"locale"?: string,"phone"?: string | null,"role"?: string,"show_name_to_owners"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"locale"?: string,"phone"?: string | null,"role"?: string,"show_name_to_owners"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string | null,"current_period_start": string | null,"id": string,"org_id": string | null,"owner_user_id": string | null,"plan_id": string,"seats": number,"status": string
                  }
                  Insert: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"org_id"?: string | null,"owner_user_id"?: string | null,"plan_id": string,"seats"?: number,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"org_id"?: string | null,"owner_user_id"?: string | null,"plan_id"?: string,"seats"?: number,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "card_daily_stats": {
                  Row: {
                    "card_id": string | null,"contact_saves": number | null,"day": string | null,"exchanges": number | null,"link_clicks": number | null,"qr_opens": number | null,"unique_visitors": number | null,"views": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "public_cards"
      referencedColumns: ["id"]
    }
                  ]
                },"public_cards": {
                  Row: {
                    "address": string | null,"avatar_path": string | null,"bio": string | null,"color_scheme": string | null,"company": string | null,"email": string | null,"first_name": string | null,"id": string | null,"last_name": string | null,"links": Json | null,"logo_path": string | null,"name_format": string | null,"org_brand_color": string | null,"org_logo_path": string | null,"org_name": string | null,"phone": string | null,"slogan": string | null,"slug": string | null,"template_id": string | null,"title": string | null,"updated_at": string | null,"website": string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "accept_org_invite":
{ Args: { "p_org_id": string }; Returns: undefined
                           },
"active_plans":
{ Args: { "uid": string }; Returns: {
              "card_limit": number,
"contact_limit": number | null,
"crm_enabled": boolean,
"features": NonNullable<Json>,
"id": string,
"is_active": boolean,
"min_seats": number,
"name_en": string,
"name_mn": string,
"price_mnt": number,
"price_per_seat_mnt": number,
"seat_limit": number | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "plans"
        isOneToOne: false
        isSetofReturn: true
      } },
"admin_list_users":
{ Args: { "p_limit"?: number,"p_search"?: string }; Returns: {
              "card_count": number,"created_at": string,"email": string,"full_name": string,"id": string,"period_end": string,"plan_id": string,"role": string,"sub_status": string
            }[]
                           },
"apply_payment_check":
{ Args: { "p_paid": boolean,"p_paid_amount": number,"p_qpay_payment_id": string,"p_raw": Json,"p_sender_invoice_no": string }; Returns: string
                           },
"attach_qpay_invoice":
{ Args: { "p_payment_id": string,"p_qpay_invoice_id": string }; Returns: undefined
                           },
"can_edit_card":
{ Args: { "card_id": string }; Returns: boolean
                           },
"can_edit_card_links":
{ Args: { "card_id": string }; Returns: boolean
                           },
"can_view_card":
{ Args: { "card": string }; Returns: boolean
                           },
"card_quota":
{ Args: { "uid": string }; Returns: number
                           },
"contact_limit":
{ Args: { "uid": string }; Returns: number
                           },
"create_pending_payment":
{ Args: { "p_org_id"?: string,"p_plan_id": string,"p_seats"?: number,"p_user": string }; Returns: {
              "amount_mnt": number,"description": string,"payment_id": string,"sender_invoice_no": string,"subscription_id": string
            }[]
                           },
"crm_enabled":
{ Args: { "uid": string }; Returns: boolean
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"expire_stale_payments":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"expire_subscriptions":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_card_stats":
{ Args: { "p_card_ids": (string)[],"p_from"?: string }; Returns: {
              "card_id": string,"contact_saves": number,"exchanges": number,"followups": number,"link_clicks": number,"qr_opens": number,"top_link_clicks": number,"top_link_kind": string,"total_opens": number,"unique_visitors": number,"views": number
            }[]
                           },
"get_link_stats":
{ Args: { "p_card_ids": (string)[],"p_from"?: string }; Returns: {
              "card_id": string,"clicks": number,"link_kind": string
            }[]
                           },
"get_my_entitlements":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_named_viewers":
{ Args: { "p_card_id": string,"p_from"?: string }; Returns: {
              "full_name": string,"last_seen": string,"opens": number,"viewer_user_id": string
            }[]
                           },
"get_org_members":
{ Args: { "p_org_id": string }; Returns: {
              "created_at": string,"email": string,"full_name": string,"member_id": string,"role": string,"status": string,"user_id": string
            }[]
                           },
"has_active_plan":
{ Args: { "uid": string }; Returns: boolean
                           },
"invite_org_member":
{ Args: { "p_actor": string,"p_email": string,"p_org_id": string,"p_role"?: string }; Returns: string
                           },
"invoke_edge_function":
{ Args: { "p_body"?: Json,"p_name": string }; Returns: number
                           },
"is_client_request":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_org_admin":
{ Args: { "org": string }; Returns: boolean
                           },
"is_org_member":
{ Args: { "org": string }; Returns: boolean
                           },
"is_personal_plan_expired":
{ Args: { "uid": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"org_has_active_plan":
{ Args: { "org": string }; Returns: boolean
                           },
"org_paid_seats":
{ Args: { "org": string }; Returns: number
                           },
"queue_followup_digests":
{ Args: { "p_day"?: string }; Returns: number
                           },
"submit_contact_exchange":
{ Args: { "p_company": string,"p_email": string,"p_message": string,"p_name": string,"p_phone": string,"p_slug": string,"p_title": string,"p_visitor_hash": string }; Returns: Json
                           },
"track_card_event":
{ Args: { "p_event": string,"p_link_kind": string,"p_slug": string,"p_viewer"?: string,"p_visitor_hash": string }; Returns: string
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
