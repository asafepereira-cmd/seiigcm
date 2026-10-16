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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assinaturas_gestoras: {
        Row: {
          gestora: string
          imagem: string
          updated_at: string
        }
        Insert: {
          gestora: string
          imagem: string
          updated_at?: string
        }
        Update: {
          gestora?: string
          imagem?: string
          updated_at?: string
        }
        Relationships: []
      }
      documento_comentarios: {
        Row: {
          autor_id: string
          created_at: string
          documento_id: string
          id: string
          texto: string
        }
        Insert: {
          autor_id?: string
          created_at?: string
          documento_id: string
          id?: string
          texto: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          documento_id?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_comentarios_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          analise_admin: boolean
          ano: number
          assunto: string
          created_at: string
          criado_por: string | null
          dados: Json
          emitido_em: string | null
          enviado_analise_em: string | null
          id: string
          numero: number
          prazo: string | null
          prioridade: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          analise_admin?: boolean
          ano: number
          assunto?: string
          created_at?: string
          criado_por?: string | null
          dados?: Json
          emitido_em?: string | null
          enviado_analise_em?: string | null
          id?: string
          numero: number
          prazo?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          analise_admin?: boolean
          ano?: number
          assunto?: string
          created_at?: string
          criado_por?: string | null
          dados?: Json
          emitido_em?: string | null
          enviado_analise_em?: string | null
          id?: string
          numero?: number
          prazo?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      funcoes_predefinidas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      paineis: {
        Row: {
          created_at: string
          funcao: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funcao: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          funcao?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      solicitacoes_assinatura: {
        Row: {
          aberto_em: string | null
          assinado_em: string | null
          created_at: string
          decisao: string | null
          documento_id: string
          em_analise_em: string | null
          gestora: string
          id: string
          observacoes: string
          signatario_funcao: string | null
          signatario_nome: string | null
          termo: string
          token: string
        }
        Insert: {
          aberto_em?: string | null
          assinado_em?: string | null
          created_at?: string
          decisao?: string | null
          documento_id: string
          em_analise_em?: string | null
          gestora: string
          id?: string
          observacoes?: string
          signatario_funcao?: string | null
          signatario_nome?: string | null
          termo?: string
          token: string
        }
        Update: {
          aberto_em?: string | null
          assinado_em?: string | null
          created_at?: string
          decisao?: string | null
          documento_id?: string
          em_analise_em?: string | null
          gestora?: string
          id?: string
          observacoes?: string
          signatario_funcao?: string | null
          signatario_nome?: string | null
          termo?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_assinatura_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      devolver_analise: { Args: { _id: string }; Returns: undefined }
      enviar_documento: {
        Args: {
          _extras: Json
          _gestoras: string[]
          _id: string
          _prazo: string
          _prioridade: string
          _termo: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_analise: { Args: { _id: string }; Returns: undefined }
      pode_emitir: { Args: { _uid: string }; Returns: boolean }
      registrar_assinatura: {
        Args: { _decisao: string; _observacoes: string; _token: string }
        Returns: undefined
      }
      submeter_analise: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "pedagogica" | "administrativa" | "emissor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "pedagogica", "administrativa", "emissor"],
    },
  },
} as const
