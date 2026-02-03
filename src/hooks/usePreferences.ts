import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserPreferences } from '../models/auth';
import { logger } from '../utils/logger';

interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  resetPreferences: () => Promise<boolean>;
  toggleTheme: () => Promise<void>;
  updateBrandColor: (color: string) => Promise<boolean>;
}

export const usePreferences = (): UsePreferencesReturn => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default preferences
  const defaultPreferences: UserPreferences = {
    id_usuario: '',
    tema: 'system',
    cor_marca: '#3b82f6',
    notificacoes: {
      email: true,
      push: true,
      escalas: true,
      lembretes: true
    },
    idioma: 'pt-BR',
    fuso_horario: 'America/Sao_Paulo'
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Use local preferences for unauthenticated users
        const localPrefs = getLocalPreferences();
        setPreferences(localPrefs);
        return;
      }

      // Try to load from database first
      const { data: dbPrefs, error: dbError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id_usuario', user.id)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        throw dbError;
      }

      if (dbPrefs) {
        setPreferences(dbPrefs);
        // Sync with localStorage
        setLocalPreferences(dbPrefs);
      } else {
        // Create default preferences for new user
        const newPrefs = { ...defaultPreferences, id_usuario: user.id };
        const { data: createdPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (createError) throw createError;
        
        setPreferences(createdPrefs);
        setLocalPreferences(createdPrefs);
      }

    } catch (error) {
      logger.error('Error loading preferences:', error, 'auth');
      setError('Falha ao carregar preferências');
      
      // Fallback to local preferences
      const localPrefs = getLocalPreferences();
      setPreferences(localPrefs);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>): Promise<boolean> => {
    try {
      setError(null);

      if (!preferences) {
        logger.warn('No preferences to update', {}, 'auth');
        return false;
      }

      const updatedPrefs = { ...preferences, ...updates };
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update in database
        const { error: updateError } = await supabase
          .from('user_preferences')
          .upsert({
            ...updatedPrefs,
            updated_at: new Date().toISOString()
          })
          .eq('id_usuario', user.id);

        if (updateError) throw updateError;
      }

      // Update local state and localStorage
      setPreferences(updatedPrefs);
      setLocalPreferences(updatedPrefs);
      
      // Apply theme immediately if changed
      if (updates.tema) {
        applyTheme(updates.tema);
      }

      if (updates.cor_marca) {
        applyBrandColor(updates.cor_marca);
      }

      logger.info('Preferences updated successfully', updates, 'auth');
      return true;

    } catch (error) {
      logger.error('Error updating preferences:', error, 'auth');
      setError('Falha ao atualizar preferências');
      return false;
    }
  };

  const resetPreferences = async (): Promise<boolean> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const resetPrefs = { ...defaultPreferences, id_usuario: user?.id || '' };

      if (user) {
        const { error: resetError } = await supabase
          .from('user_preferences')
          .upsert({
            ...resetPrefs,
            updated_at: new Date().toISOString()
          })
          .eq('id_usuario', user.id);

        if (resetError) throw resetError;
      }

      setPreferences(resetPrefs);
      setLocalPreferences(resetPrefs);
      applyTheme(resetPrefs.tema);
      applyBrandColor(resetPrefs.cor_marca);

      logger.info('Preferences reset successfully', {}, 'auth');
      return true;

    } catch (error) {
      logger.error('Error resetting preferences:', error, 'auth');
      setError('Falha ao redefinir preferências');
      return false;
    }
  };

  const toggleTheme = async (): Promise<void> => {
    if (!preferences) return;

    const themeCycle: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themeCycle.indexOf(preferences.tema);
    const nextTheme = themeCycle[(currentIndex + 1) % themeCycle.length];

    await updatePreferences({ tema: nextTheme });
  };

  const updateBrandColor = async (color: string): Promise<boolean> => {
    return await updatePreferences({ cor_marca: color });
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    toggleTheme,
    updateBrandColor
  };
};

// Helper functions for localStorage management
const getLocalPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Error parsing local preferences:', error, 'auth');
  }
  
  return {
    id_usuario: '',
    tema: 'system',
    cor_marca: '#3b82f6',
    notificacoes: {
      email: true,
      push: true,
      escalas: true,
      lembretes: true
    },
    idioma: 'pt-BR',
    fuso_horario: 'America/Sao_Paulo'
  };
};

const setLocalPreferences = (prefs: UserPreferences): void => {
  try {
    localStorage.setItem('user_preferences', JSON.stringify(prefs));
  } catch (error) {
    logger.error('Error saving local preferences:', error, 'auth');
  }
};

const applyTheme = (theme: 'light' | 'dark' | 'system'): void => {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
  
  // Store theme preference for immediate loading
  localStorage.setItem('theme', theme);
};

const applyBrandColor = (color: string): void => {
  const root = document.documentElement;
  root.style.setProperty('--brand-color', color);
  root.style.setProperty('--brand-color-rgb', hexToRgb(color));
  
  // Store brand color preference
  localStorage.setItem('brandColor', color);
};

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '59, 130, 246'; // Default blue RGB
};

// Initialize theme on app load
export const initializeTheme = (): void => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
  applyTheme(savedTheme);
  
  const savedBrandColor = localStorage.getItem('brandColor');
  if (savedBrandColor) {
    applyBrandColor(savedBrandColor);
  }
};
