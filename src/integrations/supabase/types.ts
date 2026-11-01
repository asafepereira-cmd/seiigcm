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
      arquivo_espacos: {
        Row: {
          acessos: string[]
          created_at: string
          dono_id: string
          id: string
        }
        Insert: {
          acessos?: string[]
          created_at?: string
          dono_id: string
          id?: string
        }
        Update: {
          acessos?: string[]
          created_at?: string
          dono_id?: string
          id?: string
        }
        Relationships: []
      }
      arquivo_itens: {
        Row: {
          caminho: string
          created_at: string
          documento_id: string | null
          espaco_id: string
          id: string
          nome: string
          pasta_id: string | null
          tamanho: number
          versao: number | null
        }
        Insert: {
          caminho: string
          created_at?: string
          documento_id?: string | null
          espaco_id: string
          id?: string
          nome: string
          pasta_id?: string | null
          tamanho?: number
          versao?: number | null
        }
        Update: {
          caminho?: string
          created_at?: string
          documento_id?: string | null
          espaco_id?: string
          id?: string
          nome?: string
          pasta_id?: string | null
          tamanho?: number
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivo_itens_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivo_itens_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "arquivo_espacos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivo_itens_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "arquivo_pastas"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivo_pastas: {
        Row: {
          created_at: string
          espaco_id: string
          id: string
          nome: string
          pai_id: string | null
        }
        Insert: {
          created_at?: string
          espaco_id: string
          id?: string
          nome: string
          pai_id?: string | null
        }
        Update: {
          created_at?: string
          espaco_id?: string
          id?: string
          nome?: string
          pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivo_pastas_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "arquivo_espacos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivo_pastas_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "arquivo_pastas"
            referencedColumns: ["id"]
          },
        ]
      }
      assinante_identidades: {
        Row: {
          cpf: string
          funcao: string
          nome: string
          solicitacao_id: string
        }
        Insert: {
          cpf: string
          funcao: string
          nome: string
          solicitacao_id: string
        }
        Update: {
          cpf?: string
          funcao?: string
          nome?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinante_identidades_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: true
            referencedRelation: "solicitacoes_assinatura"
            referencedColumns: ["id"]
          },
        ]
      }
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
      documento_avisos: {
        Row: {
          created_at: string
          documento_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_avisos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_comentarios: {
        Row: {
          autor_id: string
          created_at: string
          documento_id: string
          id: string
          texto: string
          versao: number
        }
        Insert: {
          autor_id?: string
          created_at?: string
          documento_id: string
          id?: string
          texto: string
          versao?: number
        }
        Update: {
          autor_id?: string
          created_at?: string
          documento_id?: string
          id?: string
          texto?: string
          versao?: number
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
      documento_destinatarios: {
        Row: {
          created_at: string
          documento_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_destinatarios_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_versoes: {
        Row: {
          arquivado_em: string
          assinaturas: Json
          dados: Json
          documento_id: string
          emitido_em: string | null
          id: string
          status: string
          versao: number
        }
        Insert: {
          arquivado_em?: string
          assinaturas?: Json
          dados: Json
          documento_id: string
          emitido_em?: string | null
          id?: string
          status: string
          versao: number
        }
        Update: {
          arquivado_em?: string
          assinaturas?: Json
          dados?: Json
          documento_id?: string
          emitido_em?: string | null
          id?: string
          status?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_versoes_documento_id_fkey"
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
          processo_id: string | null
          setor_id: string | null
          status: string
          tipo: string
          updated_at: string
          versao: number
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
          processo_id?: string | null
          setor_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          versao?: number
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
          processo_id?: string | null
          setor_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
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
          ativo: boolean
          created_at: string
          funcao: string
          nome: string
          pode_assinar: boolean
          pode_comentar: boolean
          pode_emitir: boolean
          responsavel: string
          setor: string
          tipo_painel: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao: string
          nome: string
          pode_assinar?: boolean
          pode_comentar?: boolean
          pode_emitir?: boolean
          responsavel?: string
          setor?: string
          tipo_painel?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string
          nome?: string
          pode_assinar?: boolean
          pode_comentar?: boolean
          pode_emitir?: boolean
          responsavel?: string
          setor?: string
          tipo_painel?: string
          user_id?: string
        }
        Relationships: []
      }
      processo_anexos: {
        Row: {
          caminho: string
          created_at: string
          criado_por: string
          id: string
          nome: string
          processo_id: string
        }
        Insert: {
          caminho: string
          created_at?: string
          criado_por?: string
          id?: string
          nome: string
          processo_id: string
        }
        Update: {
          caminho?: string
          created_at?: string
          criado_por?: string
          id?: string
          nome?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_anexos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          aberto_em: string | null
          acessos: string[]
          arquivado_em: string | null
          assunto: string
          created_at: string
          criado_por: string
          descricao: string
          encerrado_em: string | null
          id: string
          numero: number
          oficio_id: string | null
          oficio_versao: number | null
          tema: string
        }
        Insert: {
          aberto_em?: string | null
          acessos?: string[]
          arquivado_em?: string | null
          assunto: string
          created_at?: string
          criado_por?: string
          descricao?: string
          encerrado_em?: string | null
          id?: string
          numero?: number
          oficio_id?: string | null
          oficio_versao?: number | null
          tema: string
        }
        Update: {
          aberto_em?: string | null
          acessos?: string[]
          arquivado_em?: string | null
          assunto?: string
          created_at?: string
          criado_por?: string
          descricao?: string
          encerrado_em?: string | null
          id?: string
          numero?: number
          oficio_id?: string | null
          oficio_versao?: number | null
          tema?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_oficio_id_fkey"
            columns: ["oficio_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_colaboradores: {
        Row: {
          created_at: string
          funcao: string
          id: string
          nome: string
          setor_user_id: string
        }
        Insert: {
          created_at?: string
          funcao: string
          id?: string
          nome: string
          setor_user_id: string
        }
        Update: {
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          setor_user_id?: string
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
          finalidade: string
          gestora: string
          id: string
          observacoes: string
          signatario_funcao: string | null
          signatario_nome: string | null
          termo: string
          token: string
          versao: number
        }
        Insert: {
          aberto_em?: string | null
          assinado_em?: string | null
          created_at?: string
          decisao?: string | null
          documento_id: string
          em_analise_em?: string | null
          finalidade?: string
          gestora: string
          id?: string
          observacoes?: string
          signatario_funcao?: string | null
          signatario_nome?: string | null
          termo?: string
          token: string
          versao?: number
        }
        Update: {
          aberto_em?: string | null
          assinado_em?: string | null
          created_at?: string
          decisao?: string | null
          documento_id?: string
          em_analise_em?: string | null
          finalidade?: string
          gestora?: string
          id?: string
          observacoes?: string
          signatario_funcao?: string | null
          signatario_nome?: string | null
          termo?: string
          token?: string
          versao?: number
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
      solicitacoes_internas: {
        Row: {
          assinado_em: string
          assinante_funcao: string
          assinante_nome: string
          criado_por: string
          destinatario: string
          destinatario_id: string
          id: string
          texto: string
        }
        Insert: {
          assinado_em?: string
          assinante_funcao: string
          assinante_nome: string
          criado_por?: string
          destinatario: string
          destinatario_id: string
          id?: string
          texto: string
        }
        Update: {
          assinado_em?: string
          assinante_funcao?: string
          assinante_nome?: string
          criado_por?: string
          destinatario?: string
          destinatario_id?: string
          id?: string
          texto?: string
        }
        Relationships: []
      }
      textos_favoritos: {
        Row: {
          created_at: string
          id: string
          nome: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          texto: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          texto?: string
          user_id?: string
        }
        Relationships: []
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
      abrir_processo: {
        Args: { _id: string; _oficio: string }
        Returns: undefined
      }
      abrir_processo_simples: {
        Args: { _id: string; _numero: number }
        Returns: undefined
      }
      acesso_documento: {
        Args: { _id: string; _uid: string }
        Returns: boolean
      }
      acesso_processo: { Args: { _id: string; _uid: string }; Returns: boolean }
      assinar_identificado: {
        Args: {
          _cpf?: string
          _decisao: string
          _funcao?: string
          _nome?: string
          _observacoes: string
          _token: string
        }
        Returns: undefined
      }
      conta_ativa: { Args: { _uid: string }; Returns: boolean }
      devolver_analise: { Args: { _id: string }; Returns: undefined }
      documento_existe: { Args: { _id: string }; Returns: boolean }
      documento_recebido: {
        Args: { _id: string; _uid: string }
        Returns: boolean
      }
      e_setor: { Args: { _uid: string }; Returns: boolean }
      encaminhar_documento: {
        Args: {
          _id: string
          _prazo?: string
          _prioridade?: string
          _signatarios: Json
          _termo?: string
        }
        Returns: undefined
      }
      encerrar_arquivar_processo: { Args: { _id: string }; Returns: undefined }
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
      enviar_documento_multiplos: {
        Args: {
          _assinar: boolean
          _destinos: string[]
          _finalidade?: string
          _id: string
        }
        Returns: undefined
      }
      enviar_documento_setor: {
        Args: {
          _assinar: boolean
          _destino: string
          _finalidade?: string
          _id: string
        }
        Returns: undefined
      }
      excluir_anexo_processo: { Args: { _id: string }; Returns: undefined }
      excluir_documento: { Args: { _id: string }; Returns: undefined }
      excluir_solicitacao: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_analise: { Args: { _id: string }; Returns: undefined }
      mover_documento_processo: {
        Args: { _id: string; _processo: string }
        Returns: undefined
      }
      permissao_painel: {
        Args: { _acao: string; _uid: string }
        Returns: boolean
      }
      pode_emitir: { Args: { _uid: string }; Returns: boolean }
      proximo_numero_documento: {
        Args: { _ano: number; _tipo: string }
        Returns: number
      }
      registrar_assinatura: {
        Args: { _decisao: string; _observacoes: string; _token: string }
        Returns: undefined
      }
      retirar_documento_processo: { Args: { _id: string }; Returns: undefined }
      salvar_documento: {
        Args: { _dados: Json; _id: string; _processo?: string }
        Returns: string
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
