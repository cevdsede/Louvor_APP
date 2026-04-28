import { ViewType } from '../types';
import { isMusicView, isScaleView, isTeamView } from './views';

export type MinistryModule = 'dashboard' | 'scales' | 'music' | 'team';

export const DEFAULT_MINISTRY_MODULES: MinistryModule[] = ['dashboard', 'scales', 'team'];
export const LOUVOR_MINISTRY_MODULES: MinistryModule[] = ['dashboard', 'scales', 'music', 'team'];

const MODULES_BY_SLUG: Record<string, MinistryModule[]> = {
  louvor: LOUVOR_MINISTRY_MODULES
};

const DEFAULT_VIEW_BY_MODULE: Record<MinistryModule | 'tools', ViewType> = {
  dashboard: 'dashboard',
  scales: 'list',
  music: 'music-list',
  team: 'team',
  tools: 'tools-admin'
};

export const getModuleForView = (view: ViewType): MinistryModule | 'tools' => {
  if (view === 'dashboard') return 'dashboard';
  if (isScaleView(view)) return 'scales';
  if (isMusicView(view)) return 'music';
  if (isTeamView(view)) return 'team';
  return 'tools';
};

export const getDefaultViewForModules = (
  modules: MinistryModule[],
  canAccessTools: boolean
): ViewType => {
  const prioritizedModules: Array<MinistryModule | 'tools'> = ['dashboard', 'scales', 'team', 'music', 'tools'];

  for (const moduleId of prioritizedModules) {
    if (moduleId === 'tools') {
      if (canAccessTools) {
        return DEFAULT_VIEW_BY_MODULE.tools;
      }
      continue;
    }

    if (modules.includes(moduleId)) {
      return DEFAULT_VIEW_BY_MODULE[moduleId];
    }
  }

  return 'dashboard';
};

export const normalizeMinistryModules = (
  modulos: unknown,
  slug?: string | null
): MinistryModule[] => {
  const fallback = MODULES_BY_SLUG[(slug || '').toLowerCase()] || DEFAULT_MINISTRY_MODULES;

  if (Array.isArray(modulos)) {
    const normalized = modulos
      .map((item) => String(item))
      .filter((item): item is MinistryModule =>
        ['dashboard', 'scales', 'music', 'team'].includes(item)
      );

    return normalized.length > 0 ? normalized : fallback;
  }

  if (modulos && typeof modulos === 'object') {
    const enabled = Object.entries(modulos as Record<string, unknown>)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .filter((item): item is MinistryModule =>
        ['dashboard', 'scales', 'music', 'team'].includes(item)
      );

    return enabled.length > 0 ? enabled : fallback;
  }

  return fallback;
};
