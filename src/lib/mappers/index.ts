// Export all mappers for centralized access
export { MemberMapper } from './member.mapper';
export { MusicMapper } from './music.mapper';
export { ScaleMapper } from './scale.mapper';

// Utility function to map arrays of data
export function mapSupabaseArray<T, R>(
  data: T[],
  mapper: (item: T) => R
): R[] {
  return data.map(mapper);
}

// Utility function to map with relations
export function mapSupabaseWithRelations<T, R>(
  data: any,
  mapper: (item: any) => R
): R {
  return mapper(data);
}
