import { supabase } from '../supabaseClient';
import LocalStorageFirstService from './LocalStorageFirstService';

export interface ProximaEscala {
  id_culto: string;
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
      const cultos = LocalStorageFirstService.get<any>('cultos');
      return cultos.length;
    } catch (error) {
      console.error('Erro ao buscar total de cultos:', error);
      return 0;
    }
  }

  // Novo KIP: Total de Músicas
  async getTotalMusicas(): Promise<number> {
    try {
      const musicas = LocalStorageFirstService.get<any>('musicas');
      return musicas.length;
    } catch (error) {
      console.error('Erro ao buscar total de músicas:', error);
      return 0;
    }
  }

  // KIP 2: Próxima Escala do usuário logado
  async getProximaEscala(userId: string): Promise<ProximaEscala | null> {
    try {
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const cultos = LocalStorageFirstService.get<any>('cultos');
      const nomeCultos = LocalStorageFirstService.get<any>('nome_cultos');
      const funcoes = LocalStorageFirstService.get<any>('funcao');

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Encontrar escalas do usuário
      const minhasEscalas = escalas.filter((e: any) => e.id_membros === userId);
      if (minhasEscalas.length === 0) return null;

      // 2. Juntar com cultos e filtrar futuros
      const escalasComCulto = minhasEscalas.map((e: any) => {
        const culto = cultos.find((c: any) => c.id === e.id_culto);
        const funcao = funcoes.find((f: any) => f.id === e.id_funcao);
        const nomeCulto = nomeCultos.find((n: any) => n.id === culto?.id_nome_cultos);

        return {
          ...e,
          cultoData: culto,
          nomeCulto: nomeCulto?.nome_culto,
          funcaoNome: funcao?.nome_funcao
        };
      }).filter((e: any) => e.cultoData && e.cultoData.data_culto >= todayStr)
        .sort((a: any, b: any) => a.cultoData.data_culto.localeCompare(b.cultoData.data_culto));

      if (escalasComCulto.length === 0) return null;

      // 3. Pegar o culto mais próximo
      const primeiraEscala = escalasComCulto[0];
      const proximoCultoId = primeiraEscala.id_culto;

      // 4. Agrupar funções para esse mesmo culto
      const minhasFuncoesNesseCulto = escalasComCulto
        .filter((e: any) => e.id_culto === proximoCultoId)
        .map((e: any) => e.funcaoNome)
        .filter((val, index, self) => self.indexOf(val) === index); // Unique

      return {
        id_culto: proximoCultoId,
        culto: primeiraEscala.nomeCulto || 'Culto',
        data: primeiraEscala.cultoData.data_culto,
        horario: primeiraEscala.cultoData.horario,
        funcoes: minhasFuncoesNesseCulto
      };
    } catch (error) {
      console.error('Erro ao buscar próxima escala:', error);
      return null;
    }
  }

  // KIP 3: Frequência por Membro
  async getFrequenciaPorMembro(): Promise<FrequenciaMembro[]> {
    try {
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const membros = LocalStorageFirstService.get<any>('membros');

      // Contar cultos diferentes por membro
      const frequenciaMap = new Map<string, Set<string>>();

      escalas.forEach((escala: any) => {
        const membro = membros.find((m: any) => m.id === escala.id_membros);
        if (!membro) return;

        if (!frequenciaMap.has(membro.nome)) {
          frequenciaMap.set(membro.nome, new Set());
        }

        frequenciaMap.get(membro.nome)?.add(escala.id_culto);
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
      const membros = LocalStorageFirstService.get<any>('membros');
      const mesAtual = new Date().getMonth() + 1;

      const aniversariantes = membros
        .filter((m: any) => {
          if (!m.ativo || !m.data_nasc) return false;
          const mesMembro = new Date(m.data_nasc + 'T12:00:00').getMonth() + 1;
          return mesMembro === mesAtual;
        })
        .map((m: any) => ({
          id: m.id,
          nome: m.nome,
          data_nasc: m.data_nasc
        }))
        .sort((a: any, b: any) => {
          const diaA = new Date(a.data_nasc + 'T12:00:00').getDate();
          const diaB = new Date(b.data_nasc + 'T12:00:00').getDate();
          return diaA - diaB;
        });

      return aniversariantes;
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      return [];
    }
  }

  // Formatar data
  formatDate(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

export default new DashboardService();
