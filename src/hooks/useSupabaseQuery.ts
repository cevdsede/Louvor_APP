import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../types-supabase-generated';

// Generic Supabase query hook
export function useSupabaseQuery<T>(
  table: keyof Tables,
  select?: string,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [table, select],
    queryFn: async () => {
      let query = supabase.from(table);
      
      if (select) {
        query = query.select(select);
      } else {
        query = query.select('*');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as T;
    },
    ...options,
  });
}

// Generic Supabase mutation hook
export function useSupabaseMutation<TData, TVariables>(
  table: keyof Tables,
  operation: 'insert' | 'update' | 'delete',
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      let query = supabase.from(table);
      
      switch (operation) {
        case 'insert':
          query = query.insert(variables as TablesInsert<any>);
          break;
        case 'update':
          // For update, variables should include the id and the update data
          const { id, ...updateData } = variables as any;
          query = query.update(updateData as TablesUpdate<any>).eq('id', id);
          break;
        case 'delete':
          query = query.delete().eq('id', (variables as any).id);
          break;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TData;
    },
    onSuccess: () => {
      // Invalidate related queries on success
      queryClient.invalidateQueries({ queryKey: [table] });
    },
    ...options,
  });
}

// Specific hooks for common operations
export function useMembers(select?: string) {
  return useSupabaseQuery<any[]>('membros', select);
}

export function useMusic(select?: string) {
  return useSupabaseQuery<any[]>('musicas', select);
}

export function useScales(select?: string) {
  return useSupabaseQuery<any[]>('escalas', select);
}

export function useCults(select?: string) {
  return useSupabaseQuery<any[]>('cultos', select);
}

export function useRepertoire(select?: string) {
  return useSupabaseQuery<any[]>('repertorio', select);
}

export function useFunctions(select?: string) {
  return useSupabaseQuery<any[]>('funcao', select);
}

// Mutation hooks
export function useCreateMember() {
  return useSupabaseMutation<any, TablesInsert<'membros'>>('membros', 'insert');
}

export function useUpdateMember() {
  return useSupabaseMutation<any, TablesUpdate<'membros'> & { id: string }>('membros', 'update');
}

export function useDeleteMember() {
  return useSupabaseMutation<any, { id: string }>('membros', 'delete');
}

export function useCreateMusic() {
  return useSupabaseMutation<any, TablesInsert<'musicas'>>('musicas', 'insert');
}

export function useUpdateMusic() {
  return useSupabaseMutation<any, TablesUpdate<'musicas'> & { id: string }>('musicas', 'update');
}

export function useDeleteMusic() {
  return useSupabaseMutation<any, { id: string }>('musicas', 'delete');
}

export function useCreateScale() {
  return useSupabaseMutation<any, TablesInsert<'escalas'>>('escalas', 'insert');
}

export function useUpdateScale() {
  return useSupabaseMutation<any, TablesUpdate<'escalas'> & { id: string }>('escalas', 'update');
}

export function useDeleteScale() {
  return useSupabaseMutation<any, { id: string }>('escalas', 'delete');
}

// Complex query hooks with joins
export function useScalesWithDetails() {
  return useSupabaseQuery<any[]>(
    'escalas',
    `
      *,
      cultos (
        data_culto,
        horario,
        nome_cultos (
          nome_culto
        )
      ),
      membros (
        id,
        nome,
        email,
        foto
      ),
      funcao (
        id,
        nome_funcao
      )
    `
  );
}

export function useRepertoireWithDetails() {
  return useSupabaseQuery<any[]>(
    'repertorio',
    `
      *,
      cultos (
        data_culto,
        nome_cultos (
          nome_culto
        )
      ),
      musicas (
        id,
        musica,
        cantor,
        estilo
      ),
      tons (
        id,
        nome_tons
      ),
      membros (
        id,
        nome
      )
    `
  );
}

export function useMembersWithFunctions() {
  return useSupabaseQuery<any[]>(
    'membros',
    `
      *,
      membros_funcoes (
        funcao (
          id,
          nome_funcao
        )
      )
    `
  );
}

// Auth-related hooks
export function useAuthUser() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 0, // Always refetch auth user
    refetchOnWindowFocus: true,
  });
}

// Real-time subscription hook
export function useRealtimeSubscription<T>(
  table: keyof Tables,
  filter?: string,
  options?: UseQueryOptions<T, Error>
) {
  return useSupabaseQuery<T>(
    table,
    '*',
    {
      ...options,
      // Enable real-time updates
      refetchInterval: false,
      refetchOnWindowFocus: false,
    }
  );
}
