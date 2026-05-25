export type AppBackgroundThemeId = 'warm' | 'ice' | 'blue' | 'cyan' | 'mint' | 'lavender';

export type AppBackgroundTheme = {
  id: AppBackgroundThemeId;
  label: string;
  preview: string;
  recommendedBrand: string;
  lightGradient: string;
  darkGradient: string;
  lightTokens: AppBackgroundTokens;
  darkTokens: AppBackgroundTokens;
};

export type AppBackgroundTokens = {
  bg: string;
  bgStrong: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  border: string;
  shadow: string;
};

const darkBlueTokens: AppBackgroundTokens = {
  bg: '#08111f',
  bgStrong: '#0e1b31',
  surface: 'rgba(9, 18, 33, 0.82)',
  surfaceStrong: '#111f36',
  surfaceMuted: '#13233b',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: '0 28px 80px rgba(2, 6, 23, 0.45)'
};

export const APP_BACKGROUND_THEMES: AppBackgroundTheme[] = [
  {
    id: 'warm',
    label: 'Quente',
    preview: '#f7f1e6',
    recommendedBrand: '#1e3a8a',
    lightGradient:
      'radial-gradient(circle at top left, rgba(234, 179, 8, 0.1), transparent 28%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.1), transparent 30%), linear-gradient(180deg, #faf6ef 0%, #f7f1e6 52%, #f1e6d4 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(234, 179, 8, 0.1), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%), linear-gradient(180deg, #07101d 0%, #0b1729 54%, #10213b 100%)',
    lightTokens: {
      bg: '#f7f1e6',
      bgStrong: '#f1e6d4',
      surface: 'rgba(248, 240, 228, 0.78)',
      surfaceStrong: '#f3e8d8',
      surfaceMuted: '#ede0cb',
      border: 'rgba(120, 53, 15, 0.09)',
      shadow: '0 18px 44px rgba(39, 26, 12, 0.08)'
    },
    darkTokens: darkBlueTokens
  },
  {
    id: 'ice',
    label: 'Gelo',
    preview: '#fafbfc',
    recommendedBrand: '#334155',
    lightGradient:
      'radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #fafbfc 52%, #f3f6f9 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(148, 163, 184, 0.1), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%), linear-gradient(180deg, #07101d 0%, #0b1729 54%, #10213b 100%)',
    lightTokens: {
      bg: '#fafbfc',
      bgStrong: '#f3f6f9',
      surface: 'rgba(255, 255, 255, 0.82)',
      surfaceStrong: '#f7f9fc',
      surfaceMuted: '#eef2f6',
      border: 'rgba(15, 23, 42, 0.08)',
      shadow: '0 18px 44px rgba(15, 23, 42, 0.07)'
    },
    darkTokens: darkBlueTokens
  },
  {
    id: 'blue',
    label: 'Azul',
    preview: '#f4f8ff',
    recommendedBrand: '#2563eb',
    lightGradient:
      'radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.1), transparent 30%), linear-gradient(180deg, #fbfdff 0%, #f4f8ff 52%, #eaf2ff 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%), linear-gradient(180deg, #061322 0%, #0a1b32 54%, #102a4a 100%)',
    lightTokens: {
      bg: '#f4f8ff',
      bgStrong: '#eaf2ff',
      surface: 'rgba(248, 251, 255, 0.82)',
      surfaceStrong: '#eef5ff',
      surfaceMuted: '#dfeafe',
      border: 'rgba(30, 64, 175, 0.09)',
      shadow: '0 18px 44px rgba(30, 64, 175, 0.08)'
    },
    darkTokens: {
      ...darkBlueTokens,
      bg: '#061322',
      bgStrong: '#102a4a',
      surfaceStrong: '#10243d',
      surfaceMuted: '#153354'
    }
  },
  {
    id: 'cyan',
    label: 'Petroleo',
    preview: '#eef7fa',
    recommendedBrand: '#0e7490',
    lightGradient:
      'radial-gradient(circle at top left, rgba(6, 182, 212, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.1), transparent 30%), linear-gradient(180deg, #fbfeff 0%, #eef7fa 52%, #e0f1f5 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(6, 182, 212, 0.14), transparent 24%), radial-gradient(circle at top right, rgba(30, 58, 138, 0.14), transparent 28%), linear-gradient(180deg, #06141a 0%, #0b202b 54%, #123443 100%)',
    lightTokens: {
      bg: '#eef7fa',
      bgStrong: '#e0f1f5',
      surface: 'rgba(247, 253, 255, 0.82)',
      surfaceStrong: '#e8f6f9',
      surfaceMuted: '#d9edf2',
      border: 'rgba(8, 145, 178, 0.1)',
      shadow: '0 18px 44px rgba(8, 89, 111, 0.08)'
    },
    darkTokens: {
      ...darkBlueTokens,
      bg: '#06141a',
      bgStrong: '#123443',
      surfaceStrong: '#102a34',
      surfaceMuted: '#173947'
    }
  },
  {
    id: 'mint',
    label: 'Menta',
    preview: '#f1faf7',
    recommendedBrand: '#059669',
    lightGradient:
      'radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #fbfffd 0%, #f1faf7 52%, #e5f5ef 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(16, 185, 129, 0.13), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 28%), linear-gradient(180deg, #071612 0%, #0c241d 54%, #14372d 100%)',
    lightTokens: {
      bg: '#f1faf7',
      bgStrong: '#e5f5ef',
      surface: 'rgba(248, 255, 252, 0.82)',
      surfaceStrong: '#ebf8f3',
      surfaceMuted: '#dcf0e8',
      border: 'rgba(5, 150, 105, 0.1)',
      shadow: '0 18px 44px rgba(6, 95, 70, 0.08)'
    },
    darkTokens: {
      ...darkBlueTokens,
      bg: '#071612',
      bgStrong: '#14372d',
      surfaceStrong: '#102920',
      surfaceMuted: '#183b31'
    }
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    preview: '#f7f4ff',
    recommendedBrand: '#7c3aed',
    lightGradient:
      'radial-gradient(circle at top left, rgba(139, 92, 246, 0.11), transparent 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%), linear-gradient(180deg, #fefdff 0%, #f7f4ff 52%, #eee8ff 100%)',
    darkGradient:
      'radial-gradient(circle at top left, rgba(139, 92, 246, 0.13), transparent 24%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 28%), linear-gradient(180deg, #100d1f 0%, #171329 54%, #211b3a 100%)',
    lightTokens: {
      bg: '#f7f4ff',
      bgStrong: '#eee8ff',
      surface: 'rgba(253, 251, 255, 0.82)',
      surfaceStrong: '#f3efff',
      surfaceMuted: '#e9e2ff',
      border: 'rgba(109, 40, 217, 0.09)',
      shadow: '0 18px 44px rgba(76, 29, 149, 0.08)'
    },
    darkTokens: {
      ...darkBlueTokens,
      bg: '#100d1f',
      bgStrong: '#211b3a',
      surfaceStrong: '#1b1730',
      surfaceMuted: '#282244'
    }
  }
];

export const getAppBackgroundTheme = (id?: string | null) =>
  APP_BACKGROUND_THEMES.find((theme) => theme.id === id) || APP_BACKGROUND_THEMES[0];
