type RGB = {
  r: number;
  g: number;
  b: number;
};

export interface ChartTheme {
  brand: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
  surface: string;
  surfaceStrong: string;
  grid: string;
  palette: string[];
  paletteSoft: string[];
}

const fallback: ChartTheme = {
  brand: '#1e3a8a',
  accent: '#eab308',
  text: '#1f2937',
  mutedText: '#6b7280',
  border: 'rgba(120, 53, 15, 0.09)',
  surface: 'rgba(248, 240, 228, 0.78)',
  surfaceStrong: '#f3e8d8',
  grid: 'rgba(107, 114, 128, 0.16)',
  palette: ['#1e3a8a', '#eab308', '#0e7490', '#059669', '#7c3aed', '#334155'],
  paletteSoft: [
    'rgba(30, 58, 138, 0.82)',
    'rgba(234, 179, 8, 0.82)',
    'rgba(14, 116, 144, 0.82)',
    'rgba(5, 150, 105, 0.82)',
    'rgba(124, 58, 237, 0.82)',
    'rgba(51, 65, 85, 0.82)'
  ]
};

const readCssVar = (styles: CSSStyleDeclaration, name: string, defaultValue: string) =>
  styles.getPropertyValue(name).trim() || defaultValue;

const parseColor = (value: string, defaultColor: RGB = { r: 30, g: 58, b: 138 }): RGB => {
  const normalized = value.trim();

  if (normalized.startsWith('#') && normalized.length >= 7) {
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16)
    };
  }

  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3])
    };
  }

  return defaultColor;
};

const mix = (base: RGB, target: RGB, amount: number): RGB => ({
  r: Math.round(base.r + (target.r - base.r) * amount),
  g: Math.round(base.g + (target.g - base.g) * amount),
  b: Math.round(base.b + (target.b - base.b) * amount)
});

const toRgba = (color: RGB, alpha: number) => `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

const buildPalette = (brand: string, accent: string) => {
  const brandRgb = parseColor(brand);
  const accentRgb = parseColor(accent, { r: 234, g: 179, b: 8 });
  const dark = { r: 15, g: 23, b: 42 };
  const light = { r: 255, g: 255, b: 255 };

  const paletteRgb = [
    brandRgb,
    accentRgb,
    mix(brandRgb, accentRgb, 0.35),
    mix(brandRgb, light, 0.22),
    mix(brandRgb, dark, 0.18),
    mix(accentRgb, dark, 0.2)
  ];

  return {
    palette: paletteRgb.map((color) => toRgba(color, 1)),
    paletteSoft: paletteRgb.map((color) => toRgba(color, 0.82))
  };
};

export const getChartTheme = (): ChartTheme => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const styles = getComputedStyle(document.documentElement);
  const brand =
    readCssVar(styles, '--brand-primary', '') ||
    readCssVar(styles, '--app-brand-primary', fallback.brand);
  const accent =
    readCssVar(styles, '--brand-accent', '') ||
    readCssVar(styles, '--app-brand-accent', fallback.accent);
  const text = readCssVar(styles, '--app-text', fallback.text);
  const mutedText = readCssVar(styles, '--app-text-muted', fallback.mutedText);
  const border = readCssVar(styles, '--app-border', fallback.border);
  const surface = readCssVar(styles, '--app-surface', fallback.surface);
  const surfaceStrong = readCssVar(styles, '--app-surface-strong', fallback.surfaceStrong);
  const { palette, paletteSoft } = buildPalette(brand, accent);

  return {
    brand,
    accent,
    text,
    mutedText,
    border,
    surface,
    surfaceStrong,
    grid: toRgba(parseColor(mutedText, { r: 107, g: 114, b: 128 }), 0.16),
    palette,
    paletteSoft
  };
};
