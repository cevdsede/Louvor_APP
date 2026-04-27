import { supabase } from '../supabaseClient';
import LocalStorageFirstService from './LocalStorageFirstService';

export type AvisoGeralTipo = 'aviso_geral' | 'escala_aviso' | 'escala_musica';
export type AvisoGeralDestino = 'todos' | 'lideres' | 'escala';

export interface AvisoGeral {
  id: string | number;
  created_at: string;
  id_membro: string | null;
  texto: string | null;
  titulo?: string | null;
  tipo?: AvisoGeralTipo | null;
  remetente_id?: string | null;
  ministerio_id?: string | null;
  destino?: AvisoGeralDestino | null;
  id_culto?: string | null;
  lida?: boolean | null;
}

interface CurrentUserContext {
  userId: string;
}

interface ScaleNotificationInput {
  cultoId: string;
  ministerioId?: string | null;
  senderId: string;
  tipo: Extract<AvisoGeralTipo, 'escala_aviso' | 'escala_musica'>;
  texto: string;
}

interface GeneralNoticeInput {
  ministerioId?: string | null;
  target: Extract<AvisoGeralDestino, 'todos' | 'lideres'>;
  texto: string;
}

const normalizeText = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const isLeaderRole = (papel?: string | null) => {
  const normalized = normalizeText(papel);
  return ['lider', 'coordenador', 'administrador'].some((role) => normalized.includes(role));
};

const isAdminProfile = (perfil?: string | null) => normalizeText(perfil).includes('admin');

class AvisoGeralService {
  private static emitChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aviso-geral-updated'));
    }
  }

  private static async getCurrentUserContext(): Promise<CurrentUserContext> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario nao autenticado');
    }

    return { userId: user.id };
  }

  private static getAvisosStore(): AvisoGeral[] {
    return LocalStorageFirstService.get<AvisoGeral>('aviso_geral');
  }

  private static getMembrosStore() {
    return LocalStorageFirstService.get<any>('membros');
  }

  private static getMembrosMinisteriosStore() {
    return LocalStorageFirstService.get<any>('membros_ministerios');
  }

  private static getEscalasStore() {
    return LocalStorageFirstService.get<any>('escalas');
  }

  private static getCultosStore() {
    return LocalStorageFirstService.get<any>('cultos');
  }

  private static getNomeCultosStore() {
    return LocalStorageFirstService.get<any>('nome_cultos');
  }

  private static getCurrentMember(userId: string) {
    return this.getMembrosStore().find((member: any) => member.id === userId) || null;
  }

  private static getVisibleNotifications(userId: string, ministerioId?: string | null) {
    return this.getAvisosStore()
      .filter((aviso) => {
        if (aviso.id_membro !== userId) {
          return false;
        }

        if (!ministerioId) {
          return true;
        }

        return !aviso.ministerio_id || aviso.ministerio_id === ministerioId;
      })
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  private static buildCultoLabel(cultoId: string) {
    const cultos = this.getCultosStore();
    const nomeCultos = this.getNomeCultosStore();
    const culto = cultos.find((item: any) => item.id === cultoId);

    if (!culto) {
      return 'uma escala';
    }

    const nomeCulto = nomeCultos.find((item: any) => item.id === culto.id_nome_cultos)?.nome_culto || 'Escala';
    const data = culto.data_culto
      ? new Date(`${culto.data_culto}T00:00:00`).toLocaleDateString('pt-BR')
      : '';
    const horario = culto.horario ? String(culto.horario).slice(0, 5) : '';

    return [nomeCulto, data, horario].filter(Boolean).join(' - ');
  }

  private static buildScaleTitle(tipo: ScaleNotificationInput['tipo'], cultoId: string) {
    const label = this.buildCultoLabel(cultoId);
    return tipo === 'escala_musica' ? `Nova musica em ${label}` : `Novo aviso em ${label}`;
  }

  private static uniqueRecipientIds(recipientIds: string[]) {
    return [...new Set(recipientIds.filter(Boolean))];
  }

  private static createRecords(recipientIds: string[], base: Omit<AvisoGeral, 'id' | 'created_at' | 'id_membro'>) {
    const createdAt = new Date().toISOString();

    return this.uniqueRecipientIds(recipientIds).map((recipientId) =>
      LocalStorageFirstService.add<AvisoGeral>('aviso_geral', {
        ...base,
        id_membro: recipientId,
        created_at: createdAt,
        lida: false
      })
    );
  }

  static async getAvisosGerais(ministerioId?: string | null): Promise<AvisoGeral[]> {
    const { userId } = await this.getCurrentUserContext();
    return this.getVisibleNotifications(userId, ministerioId);
  }

  static async getAvisosByMembro(id_membro: string, ministerioId?: string | null): Promise<AvisoGeral[]> {
    const { userId } = await this.getCurrentUserContext();
    const currentMember = this.getCurrentMember(userId);
    const currentMemberships = this.getMembrosMinisteriosStore().filter(
      (membership: any) => membership.membro_id === userId && membership.ativo !== false
    );

    const canViewTarget =
      userId === id_membro ||
      normalizeText(currentMember?.perfil).includes('admin') ||
      currentMemberships.some(
        (membership: any) =>
          (!ministerioId || membership.ministerio_id === ministerioId) && isLeaderRole(membership.papel)
      );

    if (!canViewTarget) {
      throw new Error('Sem permissao para visualizar estes avisos');
    }

    const seen = new Set<string>();

    return this.getAvisosStore()
      .filter((aviso) => {
        if (aviso.remetente_id !== id_membro || aviso.destino !== 'lideres') {
          return false;
        }

        if (!ministerioId) {
          return true;
        }

        return aviso.ministerio_id === ministerioId;
      })
      .filter((aviso) => {
        const uniqueKey = [
          aviso.remetente_id || '',
          aviso.ministerio_id || '',
          aviso.created_at || '',
          aviso.texto || '',
          aviso.titulo || ''
        ].join(':');

        if (seen.has(uniqueKey)) {
          return false;
        }

        seen.add(uniqueKey);
        return true;
      })
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  static async createAvisoGeral(aviso: Omit<AvisoGeral, 'id' | 'created_at'>): Promise<AvisoGeral> {
    const created = LocalStorageFirstService.add<AvisoGeral>('aviso_geral', {
      ...aviso,
      created_at: new Date().toISOString(),
      lida: aviso.lida ?? false
    });

    this.emitChange();
    return created;
  }

  static async createGeneralNotice({ ministerioId, target, texto }: GeneralNoticeInput): Promise<number> {
    const { userId } = await this.getCurrentUserContext();
    const memberships = this.getMembrosMinisteriosStore().filter(
      (membership: any) => membership.ministerio_id === ministerioId && membership.ativo !== false
    );
    const membersById = new Map(this.getMembrosStore().map((member: any) => [member.id, member]));

    const recipientIds = memberships
      .filter((membership: any) => {
        if (target !== 'lideres') {
          return true;
        }

        const member = membersById.get(membership.membro_id);
        return isLeaderRole(membership.papel) || isAdminProfile(member?.perfil);
      })
      .map((membership: any) => membership.membro_id)
      .filter((recipientId: string) => recipientId !== userId);

    if (recipientIds.length === 0) {
      throw new Error('Nenhum destinatario encontrado para este aviso');
    }

    const created = this.createRecords(recipientIds, {
      texto,
      titulo: target === 'lideres' ? 'Aviso enviado para a lideranca' : 'Aviso geral do ministerio',
      tipo: 'aviso_geral',
      remetente_id: userId,
      ministerio_id: ministerioId || null,
      destino: target,
      id_culto: null
    });

    this.emitChange();
    return created.length;
  }

  static async notifyScaleMembers({
    cultoId,
    ministerioId,
    senderId,
    tipo,
    texto
  }: ScaleNotificationInput): Promise<number> {
    const escalas = this.getEscalasStore().filter(
      (escala: any) =>
        escala.id_culto === cultoId && (!ministerioId || !escala.ministerio_id || escala.ministerio_id === ministerioId)
    );

    const recipientIds = escalas
      .map((escala: any) => escala.id_membros)
      .filter((recipientId: string) => recipientId !== senderId);
    if (recipientIds.length === 0) {
      return 0;
    }

    const created = this.createRecords(recipientIds, {
      texto,
      titulo: this.buildScaleTitle(tipo, cultoId),
      tipo,
      remetente_id: senderId,
      ministerio_id: ministerioId || null,
      destino: 'escala',
      id_culto: cultoId
    });

    this.emitChange();
    return created.length;
  }

  static async updateAvisoGeral(id: string | number, aviso: Partial<AvisoGeral>): Promise<AvisoGeral | null> {
    const updated = LocalStorageFirstService.update<AvisoGeral>('aviso_geral', String(id), aviso);
    this.emitChange();
    return updated;
  }

  static async markAsRead(id: string | number): Promise<AvisoGeral | null> {
    return this.updateAvisoGeral(id, { lida: true });
  }

  static async markAllAsRead(ministerioId?: string | null): Promise<void> {
    const { userId } = await this.getCurrentUserContext();
    const avisos = this.getVisibleNotifications(userId, ministerioId).filter((aviso) => !aviso.lida);

    for (const aviso of avisos) {
      LocalStorageFirstService.update<AvisoGeral>('aviso_geral', String(aviso.id), { lida: true });
    }

    this.emitChange();
  }

  static async deleteAvisoGeral(id: string | number): Promise<void> {
    LocalStorageFirstService.remove('aviso_geral', String(id));
    this.emitChange();
  }
}

export default AvisoGeralService;
