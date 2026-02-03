import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';

interface SubscriptionConfig {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface RealtimeSubscriptionOptions {
  subscriptions: SubscriptionConfig[];
  onPayload?: (payload: any, table: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export const useRealtimeSubscription = ({
  subscriptions,
  onPayload,
  onError,
  enabled = true
}: RealtimeSubscriptionOptions) => {
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const subscribe = useCallback(() => {
    if (!enabled || isSubscribedRef.current) return;

    try {
      // Clean up existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new channel
      const channel = supabase.channel('realtime-subscriptions');

      // Add subscriptions for each table
      subscriptions.forEach(({ table, filter, event = '*' }) => {
        channel.on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            logger.database(`Realtime event on ${table}:`, payload, 'database');
            
            if (onPayload) {
              onPayload(payload, table);
            }
          }
        );
      });

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          logger.database('Realtime subscription established', { subscriptions }, 'database');
        } else if (status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
          const error = new Error('Realtime subscription failed');
          logger.error('Realtime subscription error:', error, 'database');
          
          if (onError) {
            onError(error);
          }
        }
      });

      channelRef.current = channel;

    } catch (error) {
      logger.error('Error setting up realtime subscription:', error, 'database');
      
      if (onError) {
        onError(error as Error);
      }
    }
  }, [enabled, subscriptions, onPayload, onError]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
        logger.database('Realtime subscription cleaned up', {}, 'database');
      } catch (error) {
        logger.error('Error cleaning up realtime subscription:', error, 'database');
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed: isSubscribedRef.current
  };
};

// Specialized hooks for common use cases
export const useMusicRealtime = (onMusicChange?: (payload: any) => void) => {
  return useRealtimeSubscription({
    subscriptions: [
      { table: 'musicas' },
      { table: 'temas' },
      { table: 'tons' },
      { table: 'repertorio' },
      { table: 'historico_musicas' }
    ],
    onPayload: (payload, table) => {
      if (onMusicChange) {
        onMusicChange({ ...payload, table });
      }
    },
    onError: (error) => {
      logger.error('Music realtime subscription error:', error, 'database');
    }
  });
};

export const useScaleRealtime = (onScaleChange?: (payload: any) => void) => {
  return useRealtimeSubscription({
    subscriptions: [
      { table: 'escalas' },
      { table: 'cultos' },
      { table: 'membros' },
      { table: 'funcao' },
      { table: 'avisos_cultos' }
    ],
    onPayload: (payload, table) => {
      if (onScaleChange) {
        onScaleChange({ ...payload, table });
      }
    },
    onError: (error) => {
      logger.error('Scale realtime subscription error:', error, 'database');
    }
  });
};

export const useMemberRealtime = (onMemberChange?: (payload: any) => void) => {
  return useRealtimeSubscription({
    subscriptions: [
      { table: 'membros' },
      { table: 'membros_funcoes' },
      { table: 'solicitacoes_membro' }
    ],
    onPayload: (payload, table) => {
      if (onMemberChange) {
        onMemberChange({ ...payload, table });
      }
    },
    onError: (error) => {
      logger.error('Member realtime subscription error:', error, 'database');
    }
  });
};

// Hook for filtered subscriptions
export const useFilteredRealtime = (
  table: string,
  filter: string,
  onPayload?: (payload: any) => void
) => {
  return useRealtimeSubscription({
    subscriptions: [{ table, filter }],
    onPayload,
    onError: (error) => {
      logger.error(`Filtered realtime subscription error for ${table}:`, error, 'database');
    }
  });
};
