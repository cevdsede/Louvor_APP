export type AppBackgroundThemeId = 'warm' | 'ice' | 'blue' | 'cyan' | 'mint' | 'lavender';

export type AppBackgroundTheme = {
  id: AppBackgroundThemeId;
  label: string;
  preview: string;
  lightGradient: string;
  darkGradient: string;
};

export const APP_BACKGROUND_THEMES: AppBackgroundTheme[] = [
  {
    id: 'warm',
    label: 'Quente',
    preview: '#f7f1e6',
    lightGradient:
      'radial-gradient(circle at top left, rgba(234, 179, 8, 0.1), transparent 28%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.1), transparent 30%), linear-gradient(180deg, #faf6ef 0%, #f7f1e6 52%, #f1e6d4 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(234, 179, 8, 0.1), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%), linear-gradient(180deg, #07101d 0%, #0b1729 54%, #10213b 100%)'
  },
  {
    id: 'ice',
    label: 'Gelo',
    preview: '#fafbfc',
    lightGradient:
      'radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #fafbfc 52%, #f3f6f9 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(148, 163, 184, 0.1), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%), linear-gradient(180deg, #07101d 0%, #0b1729 54%, #10213b 100%)'
  },
  {
    id: 'blue',
    label: 'Azul',
    preview: '#f4f8ff',
    lightGradient:
      'radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.1), transparent 30%), linear-gradient(180deg, #fbfdff 0%, #f4f8ff 52%, #eaf2ff 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%), linear-gradient(180deg, #061322 0%, #0a1b32 54%, #102a4a 100%)'
  },
  {
    id: 'cyan',
    label: 'Petroleo',
    preview: '#eef7fa',
    lightGradient:
      'radial-gradient(circle at top left, rgba(6, 182, 212, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.1), transparent 30%), linear-gradient(180deg, #fbfeff 0%, #eef7fa 52%, #e0f1f5 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(6, 182, 212, 0.14), transparent 24%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.14), transparent 28%), linear-gradient(180deg, #06141a 0%, #0b202b 54%, #123443 100%)'
  },
  {
    id: 'mint',
    label: 'Menta',
    preview: '#f1faf7',
    lightGradient:
      'radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #fbfffd 0%, #f1faf7 52%, #e5f5ef 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(16, 185, 129, 0.13), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 28%), linear-gradient(180deg, #071612 0%, #0c241d 54%, #14372d 100%)'
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    preview: '#f7f4ff',
    lightGradient:
      'radial-gradient(circle at top left, rgba(139, 92, 246, 0.11), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #fefdff 0%, #f7f4ff 52%, #eee8ff 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(139, 92, 246, 0.13), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 28%), linear-gradient(180deg, #100d1f 0%, #171329 54%, #211b3a 100%)'
  }
];

export const getAppBackgroundTheme = (id?: string | null) =>
  APP_BACKGROUND_THEMES.find((theme) => theme.id === id) || APP_BACKGROUND_THEMES[0];
