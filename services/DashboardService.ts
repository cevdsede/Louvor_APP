import LocalStorageFirstService from './LocalStorageFirstService';
import { buildWeeklyScaleItems, getWeekBoundsMondayToSunday } from '../utils/weeklyScale';
import { getDisplayName } from '../utils/displayName';

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

export interface EscalaSemanaItem {
  ministerioId: string | null;
  idCulto: string;
  culto: string;
  data: string;
  horario: string;
  funcoes: string[];
}

export interface EscalaSemanaResumo {
  startDate: string;
  endDate: string;
  items: EscalaSemanaItem[];
}

export interface Aniversariante {
  id: string;
  nome: string;
  data_nasc: string;
}

export interface DashboardScope {
  ministerioId?: string | null;
  memberIds?: string[];
  canAccessMusic?: boolean;
}

class DashboardService {
  private getMemberIdSet(scope?: DashboardScope) {
    return new Set(scope?.memberIds || []);
  }

  private hasExplicitMemberScope(scope?: DashboardScope) {
    return Array.isArray(scope?.memberIds);
  }

  private getCultoIdsByMinisterio(cultos: any[], escalas: any[], avisos: any[], ministerioId?: string | null) {
    if (!ministerioId) {
      return new Set(cultos.map((culto: any) => culto.id));
    }

    const ids = new Set<string>();

    escalas
      .filter((escala: any) => escala.ministerio_id === ministerioId)
      .forEach((escala: any) => ids.add(escala.id_culto));

    avisos
      .filter((aviso: any) => aviso.ministerio_id === ministerioId)
      .forEach((aviso: any) => ids.add(aviso.id_cultos));

    return ids;
  }

  async getTotalCultos(scope?: DashboardScope): Promise<number> {
    try {
      const cultos = LocalStorageFirstService.get<any>('cultos');
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const avisos = LocalStorageFirstService.get<any>('avisos_cultos');
      return this.getCultoIdsByMinisterio(cultos, escalas, avisos, scope?.ministerioId).size;
    } catch (error) {
      console.error('Erro ao buscar total de cultos:', error);
      return 0;
    }
  }

  async getTotalMusicas(scope?: DashboardScope): Promise<number> {
    try {
      if (scope?.canAccessMusic === false) {
        return 0;
      }

      const musicas = LocalStorageFirstService.get<any>('musicas');
      return musicas.length;
    } catch (error) {
      console.error('Erro ao buscar total de musicas:', error);
      return 0;
    }
  }

  async getProximaEscala(userId: string, scope?: DashboardScope): Promise<ProximaEscala | null> {
    try {
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const cultos = LocalStorageFirstService.get<any>('cultos');
      const nomeCultos = LocalStorageFirstService.get<any>('nome_cultos');
      const funcoes = LocalStorageFirstService.get<any>('funcao');
      const todayStr = new Date().toISOString().split('T')[0];

      const minhasEscalas = escalas.filter(
        (escala: any) =>
          escala.id_membros === userId &&
          (!scope?.ministerioId || escala.ministerio_id === scope.ministerioId)
      );

      if (minhasEscalas.length === 0) {
        return null;
      }

      const escalasComCulto = minhasEscalas
        .map((escala: any) => {
          const culto = cultos.find((item: any) => item.id === escala.id_culto);
          const funcao = funcoes.find((item: any) => item.id === escala.id_funcao);
          const nomeCulto = nomeCultos.find((item: any) => item.id === culto?.id_nome_cultos);

          return {
            ...escala,
            cultoData: culto,
            nomeCulto: nomeCulto?.nome_culto,
            funcaoNome: funcao?.nome_funcao
          };
        })
        .filter((escala: any) => escala.cultoData && escala.cultoData.data_culto >= todayStr)
        .sort((a: any, b: any) => a.cultoData.data_culto.localeCompare(b.cultoData.data_culto));

      if (escalasComCulto.length === 0) {
        return null;
      }

      const primeiraEscala = escalasComCulto[0];
      const proximoCultoId = primeiraEscala.id_culto;
      const minhasFuncoesNesseCulto = escalasComCulto
        .filter((escala: any) => escala.id_culto === proximoCultoId)
        .map((escala: any) => escala.funcaoNome)
        .filter((value: string, index: number, self: string[]) => Boolean(value) && self.indexOf(value) === index);

      return {
        id_culto: proximoCultoId,
        culto: primeiraEscala.nomeCulto || 'Culto',
        data: primeiraEscala.cultoData.data_culto,
        horario: primeiraEscala.cultoData.horario,
        funcoes: minhasFuncoesNesseCulto
      };
    } catch (error) {
      console.error('Erro ao buscar proxima escala:', error);
      return null;
    }
  }

  async getEscalasDaSemana(userId: string, scope?: DashboardScope): Promise<EscalaSemanaResumo> {
    try {
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const cultos = LocalStorageFirstService.get<any>('cultos');
      const nomeCultos = LocalStorageFirstService.get<any>('nome_cultos');
      const funcoes = LocalStorageFirstService.get<any>('funcao');
      const weekBounds = getWeekBoundsMondayToSunday();

      return {
        startDate: weekBounds.startDate,
        endDate: weekBounds.endDate,
        items: buildWeeklyScaleItems({
          userId,
          escalas,
          cultos,
          nomeCultos,
          funcoes,
          ministerioId: scope?.ministerioId
        })
      };
    } catch (error) {
      console.error('Erro ao buscar escalas da semana:', error);

      const weekBounds = getWeekBoundsMondayToSunday();

      return {
        startDate: weekBounds.startDate,
        endDate: weekBounds.endDate,
        items: []
      };
    }
  }

  async getVersiculoDiario(): Promise<string> {
    return this.getVersiculoPadrao();
  }

  private getVersiculoPadrao(): string {
    const versiculos = [
      'Porque Deus amou o mundo de tal maneira, que deu seu Filho unigenito, para que todo aquele que nele cre nao pereca, mas tenha a vida eterna. Joao 3:16',
      'O Senhor e o meu pastor; nada me faltara. Salmos 23:1',
      'Tudo posso naquele que me fortalece. Filipenses 4:13',
      'Confia no Senhor de todo o teu coracao, e nao te estribes no teu proprio entendimento. Proverbios 3:5',
      'Porque eu sei bem os pensamentos que penso de vos, diz o Senhor; pensamentos de paz, e nao de mal. Jeremias 29:11',
      'O Senhor e a minha luz e a minha salvacao; a quem temerei? Salmos 27:1',
      'Toda a Escritura e divinamente inspirada, e proveitosa para ensinar, para corrigir, para instruir em justica. 2 Timoteo 3:16',
      'Nao temas, porque eu sou contigo; nao te assombres, porque eu sou teu Deus. Isaias 41:10',
      'Deleita-te tambem no Senhor, e ele te concedera o que deseja o teu coracao. Salmos 37:4',
      'O choro pode durar uma noite, mas a alegria vem pela manha. Salmos 30:5'
    ];

    const hoje = new Date();
    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
    return versiculos[diaDoAno % versiculos.length];
  }

  async getTotalMembrosAtivos(scope?: DashboardScope): Promise<number> {
    try {
      const membros = LocalStorageFirstService.get<any>('membros');
      const memberIds = this.getMemberIdSet(scope);
      const shouldFilterByMembers = this.hasExplicitMemberScope(scope);

      return membros.filter((membro: any) => {
        if (!membro.ativo) return false;
        if (!shouldFilterByMembers) return true;
        return memberIds.has(membro.id);
      }).length;
    } catch (error) {
      console.error('Erro ao buscar total de membros ativos:', error);
      return 0;
    }
  }

  async getFrequenciaPorMembro(scope?: DashboardScope): Promise<FrequenciaMembro[]> {
    try {
      const escalas = LocalStorageFirstService.get<any>('escalas');
      const membros = LocalStorageFirstService.get<any>('membros');
      const cultos = LocalStorageFirstService.get<any>('cultos');
      const memberIds = this.getMemberIdSet(scope);
      const shouldFilterByMembers = this.hasExplicitMemberScope(scope);
      const hoje = new Date();
      const inicioPeriodo = new Date(hoje);

      inicioPeriodo.setHours(0, 0, 0, 0);
      inicioPeriodo.setMonth(inicioPeriodo.getMonth() - 10);
      hoje.setHours(23, 59, 59, 999);

      const cultoPorId = new Map(cultos.map((culto: any) => [culto.id, culto]));
      const membroPorId = new Map(membros.map((membro: any) => [membro.id, membro]));
      const frequenciaMap = new Map<string, Set<string>>();

      escalas.forEach((escala: any) => {
        if (scope?.ministerioId && escala.ministerio_id !== scope.ministerioId) {
          return;
        }

        if (shouldFilterByMembers && !memberIds.has(escala.id_membros)) {
          return;
        }

        const culto = cultoPorId.get(escala.id_culto);
        const dataCultoBase = culto?.data_culto?.split('T')[0];
        const dataCulto = dataCultoBase ? new Date(`${dataCultoBase}T12:00:00`) : null;

        if (!dataCulto || Number.isNaN(dataCulto.getTime()) || dataCulto < inicioPeriodo || dataCulto > hoje) {
          return;
        }

        const membro = membroPorId.get(escala.id_membros);
        if (!membro) return;

        const displayName = getDisplayName(membro);
        if (!frequenciaMap.has(displayName)) {
          frequenciaMap.set(displayName, new Set());
        }

        frequenciaMap.get(displayName)?.add(escala.id_culto);
      });

      return Array.from(frequenciaMap.entries())
        .map(([nome, cultosSet]) => ({
          nome,
          quantidade: cultosSet.size
        }))
        .sort((a, b) => b.quantidade - a.quantidade);
    } catch (error) {
      console.error('Erro ao buscar frequencia por membro:', error);
      return [];
    }
  }

  async getAniversariantesDoMes(scope?: DashboardScope): Promise<Aniversariante[]> {
    try {
      const membros = LocalStorageFirstService.get<any>('membros');
      const memberIds = this.getMemberIdSet(scope);
      const shouldFilterByMembers = this.hasExplicitMemberScope(scope);
      const mesAtual = new Date().getMonth() + 1;

      return membros
        .filter((membro: any) => {
          if (!membro.ativo || !membro.data_nasc) return false;
          if (shouldFilterByMembers && !memberIds.has(membro.id)) return false;

          const mesMembro = new Date(`${membro.data_nasc}T12:00:00`).getMonth() + 1;
          return mesMembro === mesAtual;
        })
        .map((membro: any) => ({
          id: membro.id,
          nome: getDisplayName(membro),
          data_nasc: membro.data_nasc
        }))
        .sort((a, b) => {
          const diaA = new Date(`${a.data_nasc}T12:00:00`).getDate();
          const diaB = new Date(`${b.data_nasc}T12:00:00`).getDate();
          return diaA - diaB;
        });
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      return [];
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

export default new DashboardService();
