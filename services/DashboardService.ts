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

      // Agrupar por culto e coletar funções (sem duplicatas)
      const item = escalas[0] as any;
      const proximoCulto = item.cultos;
      const nomeCulto = proximoCulto.nome_cultos?.nome_culto || 'Culto sem nome';

      // Coletar funções únicas para este culto
      const funcoesUnicas = new Set<string>();
      (escalas as any[])
        .filter(e => e.cultos.id === proximoCulto.id)
        .forEach(e => {
          if (e.funcao && e.funcao.nome_funcao) {
            funcoesUnicas.add(e.funcao.nome_funcao);
          }
        });

      return {
        culto: nomeCulto,
        data: proximoCulto.data_culto,
        horario: proximoCulto.horario,
        funcoes: Array.from(funcoesUnicas)
      };
    } catch (error) {
      console.error('Erro ao buscar próxima escala:', error);
      return null;
    }
  }

  // KIP 4: Versículo Diário Automático
  async getVersiculoDiario(): Promise<string> {
    try {
      // Tentar buscar de uma API pública de versículos
      const response = await fetch('https://www.biblegateway.com/votd/get/?format=json&version=NVI');
      
      if (response.ok) {
        const data = await response.json();
        return data.votd?.verse?.text || this.getVersiculoPadrao();
      }
      
      // Fallback para versículos pré-cadastrados se a API falhar
      return this.getVersiculoPadrao();
    } catch (error) {
      console.error('Erro ao buscar versículo diário:', error);
      return this.getVersiculoPadrao();
    }
  }

  // Versículos pré-cadastrados como fallback
  private getVersiculoPadrao(): string {
    const versiculos = [
      "Porque Deus amou o mundo de tal maneira, que deu seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna. João 3:16",
      "O Senhor é o meu pastor; nada me faltará. Salmos 23:1",
      "Tudo posso naquele que me fortalece. Filipenses 4:13",
      "Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento. Provérbios 3:5",
      "Porque eu sei bem os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal. Jeremias 29:11",
      "O Senhor é a minha luz e a minha salvação; a quem temerei? Salmos 27:1",
      "Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para redargüir, para corrigir, para instruir em justiça. 2 Timóteo 3:16",
      "Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus. Isaías 41:10",
      "Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração. Salmos 37:4",
      "O choro pode durar uma noite, mas a alegria vem pela manhã. Salmos 30:5"
    ];
    
    // Selecionar versículo baseado na data atual (sempre o mesmo versículo no mesmo dia)
    const hoje = new Date();
    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
    const indice = diaDoAno % versiculos.length;
    
    return versiculos[indice];
  }

  // KIP 5: Versículo da Biblia.com API (alternativa)
  async getVersiculoBibliaCom(): Promise<string> {
    try {
      // API da YouVersion (Biblia.com)
      const response = await fetch('https://developers.youversionapi.com/v1/bible/verse-of-the-day?language=pt-br');
      
      if (response.ok) {
        const data = await response.json();
        return `${data.content} - ${data.reference}`;
      }
      
      return this.getVersiculoPadrao();
    } catch (error) {
      console.error('Erro ao buscar versículo Biblia.com:', error);
      return this.getVersiculoPadrao();
    }
  }

  // KIP 6: Versículo do API.bible (alternativa)
  async getVersiculoApiBible(): Promise<string> {
    try {
      // Selecionar um livro e capítulo aleatório
      const livros = ['GEN', 'PSA', 'PRO', 'ISA', 'MAT', 'JOH', 'ROM', 'HEB'];
      const livro = livros[Math.floor(Math.random() * livros.length)];
      const capitulo = Math.floor(Math.random() * 50) + 1;
      const versiculo = Math.floor(Math.random() * 30) + 1;
      
      const response = await fetch(`https://api.scripture.api.bible/v1/bibles/064252adfa2d9377-01/verses/${livro}.${capitulo}.${versiculo}?content-type=text&include-notes=false&include-titles=false`);
      
      if (response.ok) {
        const data = await response.json();
        return `${data.data.content} - ${data.data.reference}`;
      }
      
      return this.getVersiculoPadrao();
    } catch (error) {
      console.error('Erro ao buscar versículo API.bible:', error);
      return this.getVersiculoPadrao();
    }
  }

  // KIP 3: Total de Membros Ativos
  async getTotalMembrosAtivos(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('membros')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar total de membros ativos:', error);
      return 0;
    }
  }

  // KIP 4: Frequência por Membro
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

      // Converter para o formato esperado - MOSTRAR TODOS OS MEMBROS
      const frequencia: FrequenciaMembro[] = Array.from(frequenciaMap.entries())
        .map(([nome, cultosSet]) => ({
          nome,
          quantidade: cultosSet.size
        }))
        .sort((a, b) => b.quantidade - a.quantidade); // Removido o slice(0, 10) para mostrar todos

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
