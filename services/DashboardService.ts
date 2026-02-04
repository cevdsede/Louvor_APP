import { supabase } from '../supabaseClient';
import { SupabaseCulto, SupabaseEscala, SupabaseMembro } from '../types-supabase';

export interface ProximaEscala {
  culto: string;
  data: string;
  horario: string;
  funcoes: string[];
}

export interface FrequenciaMembro {
  nome: string;
  quantidade: number;
}

export interface Aniversariante {
  id: string;
  nome: string;
  data_nasc: string;
}

class DashboardService {
  // KIP 1: Total de Cultos
  async getTotalCultos(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('cultos')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar total de cultos:', error);
      return 0;
    }
  }

  // Novo KIP: Total de Músicas
  async getTotalMusicas(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('musicas')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar total de músicas:', error);
      return 0;
    }
  }

  // KIP 2: Próxima Escala do usuário logado
  async getProximaEscala(userId: string): Promise<ProximaEscala | null> {
    try {
      // Buscar escalas do usuário com data futura
      const { data: escalas, error } = await supabase
        .from('escalas')
        .select(`
          id,
          id_culto,
          id_funcao,
          cultos!inner (
            id,
            id_nome_cultos,
            data_culto,
            horario,
            nome_cultos!inner (
              nome_culto
            )
          ),
          funcao!inner (
            id,
            nome_funcao
          )
        `)
        .eq('id_membros', userId)
        .gte('cultos.data_culto', new Date().toISOString().split('T')[0])
        .order('data_culto', { referencedTable: 'cultos', ascending: true });

      if (error) throw error;

      if (!escalas || escalas.length === 0) {
        return null;
      }

      // Agrupar por culto e coletar funções
      const item = escalas[0] as any;
      const proximoCulto = item.cultos;
      const nomeCulto = proximoCulto.nome_cultos?.nome_culto || 'Culto sem nome';

      const funcoes = (escalas as any[])
        .filter(e => e.cultos.id === proximoCulto.id)
        .map(e => e.funcao.nome_funcao);

      return {
        culto: nomeCulto,
        data: proximoCulto.data_culto,
        horario: proximoCulto.horario,
        funcoes: funcoes
      };
    } catch (error) {
      console.error('Erro ao buscar próxima escala:', error);
      return null;
    }
  }

  // KIP 3: Frequência por Membro
  async getFrequenciaPorMembro(): Promise<FrequenciaMembro[]> {
    try {
      const { data, error } = await supabase
        .from('escalas')
        .select(`
          membros!inner (
            id,
            nome
          ),
          cultos!inner (
            id
          )
        `);

      if (error) throw error;

      // Contar cultos diferentes por membro
      const frequenciaMap = new Map<string, Set<string>>();

      data?.forEach(escala => {
        const m: any = (escala as any).membros;
        const c: any = (escala as any).cultos;

        if (!m || !c) return;

        const membroNome = m.nome;
        const cultoId = c.id;

        if (!frequenciaMap.has(membroNome)) {
          frequenciaMap.set(membroNome, new Set());
        }

        frequenciaMap.get(membroNome)?.add(cultoId);
      });

      // Converter para o formato esperado
      const frequencia: FrequenciaMembro[] = Array.from(frequenciaMap.entries())
        .map(([nome, cultosSet]) => ({
          nome,
          quantidade: cultosSet.size
        }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 10); // Top 10 membros

      return frequencia;
    } catch (error) {
      console.error('Erro ao buscar frequência por membro:', error);
      return [];
    }
  }

  // Novo KIP: Aniversariantes do Mês
  async getAniversariantesDoMes(): Promise<Aniversariante[]> {
    try {
      const mesAtual = new Date().getMonth() + 1;

      const { data, error } = await supabase
        .from('membros')
        .select('id, nome, data_nasc')
        .eq('ativo', true)
        .order('data_nasc', { ascending: true });

      if (error) throw error;

      // Filtrar por mês no JS pois o PostgreSQL do Supabase pode ser chato com EXTRACT em queries simples de client
      const aniversariantes = (data || []).filter(m => {
        if (!m.data_nasc) return false;
        const mesMembro = new Date(m.data_nasc + 'T12:00:00').getMonth() + 1;
        return mesMembro === mesAtual;
      });

      return aniversariantes as Aniversariante[];
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      return [];
    }
  }

  // Formatar data
  private formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

export default new DashboardService();
