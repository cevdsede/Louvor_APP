import { ViewType } from '../types';

export const SCALE_VIEWS = ['list', 'calendar', 'cleaning'] as const;
export const MUSIC_VIEWS = [
  'music-stats',
  'music-list',
  'music-repertoire',
  'music-create',
  'music-history',
  'music-escalas'
] as const;
export const TEAM_VIEWS = ['team', 'attendance'] as const;
export const TOOLS_VIEWS = ['tools-admin', 'tools-users', 'tools-approvals', 'tools-performance'] as const;

export type ScaleView = (typeof SCALE_VIEWS)[number];
export type MusicView = (typeof MUSIC_VIEWS)[number];
export type TeamView = (typeof TEAM_VIEWS)[number];
export type ToolsView = (typeof TOOLS_VIEWS)[number];

const includesView = <T extends readonly ViewType[]>(views: T, view: ViewType): view is T[number] =>
  views.includes(view as T[number]);

export const isScaleView = (view: ViewType): view is ScaleView => includesView(SCALE_VIEWS, view);
export const isMusicView = (view: ViewType): view is MusicView => includesView(MUSIC_VIEWS, view);
export const isTeamView = (view: ViewType): view is TeamView => includesView(TEAM_VIEWS, view);
export const isToolsView = (view: ViewType): view is ToolsView => includesView(TOOLS_VIEWS, view);
