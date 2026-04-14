import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import useLocalStorageFirst from '../hooks/useLocalStorageFirst';
import { DEFAULT_MINISTRY_MODULES, MinistryModule, normalizeMinistryModules } from '../utils/ministry';

const ACTIVE_MINISTRY_STORAGE_KEY = 'louvor_active_ministerio_id';

export interface Ministerio {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  ativo?: boolean;
  modulos?: MinistryModule[] | Record<string, boolean> | null;
  created_at?: string;
}

export interface MembroMinisterio {
  id: string;
  membro_id: string;
  ministerio_id: string;
  principal?: boolean;
  ativo?: boolean;
  papel?: string | null;
  created_at?: string;
}

interface CurrentMember {
  id: string;
  nome: string;
  email?: string | null;
  perfil?: string | null;
  ativo?: boolean;
}

interface MinistryContextValue {
  currentMember: CurrentMember | null;
  activeMinisterio: Ministerio | null;
  activeMinisterioId: string | null;
  activeModules: MinistryModule[];
  memberships: MembroMinisterio[];
  userMinisterios: Ministerio[];
  loading: boolean;
  isGlobalAdminOrLeader: boolean;
  canManageCurrentMinisterio: boolean;
  setActiveMinisterioId: (ministerioId: string) => void;
  canAccessModule: (moduleId: MinistryModule) => boolean;
}

const MinistryContext = createContext<MinistryContextValue | undefined>(undefined);

const isActiveRow = (row: { ativo?: boolean | null } | null | undefined) => row?.ativo !== false;

const isAdminProfile = (perfil?: string | null) => {
  const normalized = (perfil || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('admin') || normalized.includes('lider');
};

const isManagerRole = (papel?: string | null) => {
  const normalized = (papel || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['lider', 'coordenador', 'administrador'].some((item) => normalized.includes(item));
};

export const MinistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: membrosRaw, loading: membrosLoading } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: ministeriosRaw, loading: ministeriosLoading } = useLocalStorageFirst<any>({ table: 'ministerios' });
  const { data: membrosMinisteriosRaw, loading: membrosMinisteriosLoading } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeMinisterioId, setActiveMinisterioIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_MINISTRY_STORAGE_KEY);
  });
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      try {
        const cachedSession = localStorage.getItem('supabase_session_cache');
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession);
          if (parsed?.user?.id && isMounted) {
            setCurrentUserId(parsed.user.id);
          }
        }

        if (!navigator.onLine) {
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setCurrentUserId(user?.id || null);
        }
      } catch (error) {
        console.error('Erro ao resolver usuário do contexto de ministério:', error);
      } finally {
        if (isMounted) {
          setAuthResolved(true);
        }
      }
    };

    resolveUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentMember = useMemo<CurrentMember | null>(() => {
    if (!currentUserId) return null;

    const byId = membrosRaw.find((member: any) => member.id === currentUserId);
    if (byId) {
      return byId;
    }

    return null;
  }, [currentUserId, membrosRaw]);

  const isGlobalAdminOrLeader = useMemo(
    () => isAdminProfile(currentMember?.perfil),
    [currentMember?.perfil]
  );

  const memberships = useMemo<MembroMinisterio[]>(() => {
    if (!currentMember) return [];

    const ownMemberships = (membrosMinisteriosRaw || [])
      .filter((membership: any) => membership.membro_id === currentMember.id && isActiveRow(membership));

    return ownMemberships;
  }, [currentMember, membrosMinisteriosRaw]);

  const allMinisterios = useMemo<Ministerio[]>(() => {
    return (ministeriosRaw || []).filter((ministerio: any) => isActiveRow(ministerio));
  }, [ministeriosRaw]);

  const userMinisterios = useMemo<Ministerio[]>(() => {
    if (isGlobalAdminOrLeader) {
      return allMinisterios;
    }

    const accessibleIds = new Set(memberships.map((membership) => membership.ministerio_id));
    return allMinisterios.filter((ministerio) => accessibleIds.has(ministerio.id));
  }, [allMinisterios, isGlobalAdminOrLeader, memberships]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const availableIds = new Set(userMinisterios.map((ministerio) => ministerio.id));
    const principalMembership = memberships.find((membership) => membership.principal) || memberships[0];

    let nextActiveId = activeMinisterioId;

    if (!nextActiveId || !availableIds.has(nextActiveId)) {
      nextActiveId = principalMembership?.ministerio_id || userMinisterios[0]?.id || null;
    }

    if (nextActiveId !== activeMinisterioId) {
      setActiveMinisterioIdState(nextActiveId);
    }

    if (nextActiveId) {
      localStorage.setItem(ACTIVE_MINISTRY_STORAGE_KEY, nextActiveId);
    } else {
      localStorage.removeItem(ACTIVE_MINISTRY_STORAGE_KEY);
    }
  }, [activeMinisterioId, memberships, userMinisterios]);

  const activeMinisterio = useMemo(() => {
    if (!activeMinisterioId) {
      return userMinisterios[0] || null;
    }

    return userMinisterios.find((ministerio) => ministerio.id === activeMinisterioId) || userMinisterios[0] || null;
  }, [activeMinisterioId, userMinisterios]);

  const activeMembership = useMemo(() => {
    if (!currentMember || !activeMinisterio) return null;

    return memberships.find(
      (membership) => membership.membro_id === currentMember.id && membership.ministerio_id === activeMinisterio.id
    ) || null;
  }, [activeMinisterio, currentMember, memberships]);

  const activeModules = useMemo(
    () => normalizeMinistryModules(activeMinisterio?.modulos, activeMinisterio?.slug) || DEFAULT_MINISTRY_MODULES,
    [activeMinisterio?.modulos, activeMinisterio?.slug]
  );

  const canAccessModule = (moduleId: MinistryModule) => activeModules.includes(moduleId);

  const setActiveMinisterioId = (ministerioId: string) => {
    setActiveMinisterioIdState(ministerioId);

    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_MINISTRY_STORAGE_KEY, ministerioId);
    }
  };

  const value = useMemo<MinistryContextValue>(
    () => ({
      currentMember,
      activeMinisterio,
      activeMinisterioId: activeMinisterio?.id || null,
      activeModules,
      memberships,
      userMinisterios,
      loading: !authResolved || membrosLoading || ministeriosLoading || membrosMinisteriosLoading,
      isGlobalAdminOrLeader,
      canManageCurrentMinisterio: isGlobalAdminOrLeader || isManagerRole(activeMembership?.papel),
      setActiveMinisterioId,
      canAccessModule
    }),
    [
      activeMembership?.papel,
      activeMinisterio,
      activeModules,
      authResolved,
      currentMember,
      currentUserId,
      isGlobalAdminOrLeader,
      memberships,
      membrosLoading,
      membrosMinisteriosLoading,
      ministeriosLoading,
      userMinisterios
    ]
  );

  return <MinistryContext.Provider value={value}>{children}</MinistryContext.Provider>;
};

export const useMinistryContext = () => {
  const context = useContext(MinistryContext);

  if (!context) {
    throw new Error('useMinistryContext deve ser usado dentro de MinistryProvider');
  }

  return context;
};
