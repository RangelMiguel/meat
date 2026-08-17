/** Same palettes as MisFinanzas (Finance). All themes are dark. */
export const THEME_IDS = [
  'midnight',
  'ocean',
  'forest',
  'sunset',
  'rose',
  'amethyst',
  'gold',
  'slate',
  'ember',
  'aurora',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const defaultTheme: ThemeId = 'midnight'

export interface ThemeMeta {
  id: ThemeId
  name: { en: string; es: string }
  tagline: { en: string; es: string }
  preview: {
    bg: string
    surface: string
    primary: string
    accent: string
    text: string
  }
}

export const themes: ThemeMeta[] = [
  {
    id: 'midnight',
    name: { en: 'Midnight', es: 'Medianoche' },
    tagline: {
      en: 'Midnight observatory — teal, violet & rose',
      es: 'Observatorio nocturno — teal, violeta y rosa',
    },
    preview: { bg: '#0a0c16', surface: '#0c101f', primary: '#2dd4bf', accent: '#a78bfa', text: '#f7f4ef' },
  },
  {
    id: 'ocean',
    name: { en: 'Ocean', es: 'Océano' },
    tagline: { en: 'Deep blues and cool cyan', es: 'Azules profundos y cian fresco' },
    preview: { bg: '#061018', surface: '#0a1624', primary: '#38bdf8', accent: '#6366f1', text: '#f3f9ff' },
  },
  {
    id: 'forest',
    name: { en: 'Forest', es: 'Bosque' },
    tagline: { en: 'Emerald and moss greens', es: 'Verdes esmeralda y musgo' },
    preview: { bg: '#07140e', surface: '#0c1a12', primary: '#4ade80', accent: '#34d399', text: '#f3fdf6' },
  },
  {
    id: 'sunset',
    name: { en: 'Sunset', es: 'Atardecer' },
    tagline: { en: 'Warm orange, coral and amber', es: 'Naranja, coral y ámbar cálido' },
    preview: { bg: '#140a08', surface: '#1c100c', primary: '#fb923c', accent: '#f472b6', text: '#fff8f1' },
  },
  {
    id: 'rose',
    name: { en: 'Rose', es: 'Rosa' },
    tagline: { en: 'Soft pinks and magentas', es: 'Rosas y magentas suaves' },
    preview: { bg: '#140810', surface: '#1a0c16', primary: '#f472b6', accent: '#e879f9', text: '#fff4fa' },
  },
  {
    id: 'amethyst',
    name: { en: 'Amethyst', es: 'Amatista' },
    tagline: { en: 'Purples and indigo', es: 'Púrpuras e índigo' },
    preview: { bg: '#0c0818', surface: '#120c22', primary: '#c084fc', accent: '#818cf8', text: '#f7f5ff' },
  },
  {
    id: 'gold',
    name: { en: 'Gold', es: 'Oro' },
    tagline: { en: 'Gold tones on dark coffee', es: 'Dorados y tonos café oscuro' },
    preview: { bg: '#120e08', surface: '#18140c', primary: '#fbbf24', accent: '#f59e0b', text: '#fffdf3' },
  },
  {
    id: 'slate',
    name: { en: 'Slate', es: 'Pizarra' },
    tagline: { en: 'Cool minimal grays', es: 'Grises fríos y minimalistas' },
    preview: { bg: '#0b0f14', surface: '#10161e', primary: '#94a3b8', accent: '#64748b', text: '#f8fafc' },
  },
  {
    id: 'ember',
    name: { en: 'Ember', es: 'Ascua' },
    tagline: { en: 'Reds on burning charcoal', es: 'Rojos y carbón ardiente' },
    preview: { bg: '#120808', surface: '#1a0a0a', primary: '#f87171', accent: '#fb7185', text: '#fff5f5' },
  },
  {
    id: 'aurora',
    name: { en: 'Aurora', es: 'Aurora' },
    tagline: { en: 'Northern green, cyan and rose hints', es: 'Verde boreal, cian y toques de rosa' },
    preview: { bg: '#0a1214', surface: '#0c1a1e', primary: '#2dd4bf', accent: '#22d3ee', text: '#f2feff' },
  },
]

const LEGACY: Record<string, ThemeId> = {
  grove: 'forest',
  ignite: 'midnight',
  citrus: 'sunset',
  berry: 'rose',
  dark: 'midnight',
  default: 'midnight',
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function normalizeThemeId(value: unknown): ThemeId {
  if (typeof value !== 'string' || value === '') return defaultTheme
  if (isThemeId(value)) return value
  return LEGACY[value] ?? defaultTheme
}
