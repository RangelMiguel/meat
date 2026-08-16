export type ThemeId = 'grove' | 'ignite' | 'citrus' | 'slate' | 'berry'

export interface ThemeMeta {
  id: ThemeId
  name: string
  tagline: string
  description: string
  vibe: string[]
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
    id: 'grove',
    name: 'Grove',
    tagline: 'Calm nature wellness',
    description:
      'Oat backgrounds, sage green, and soft rounds — a quiet daily journal feel that makes logging food feel gentle, not clinical.',
    vibe: ['Light', 'Calm', 'Organic', 'Soft'],
    preview: {
      bg: '#f3f0e8',
      surface: '#fffcf7',
      primary: '#3f7a5a',
      accent: '#a8c4a2',
      text: '#1f2a24',
    },
  },
  {
    id: 'ignite',
    name: 'Ignite',
    tagline: 'Dark athletic performance',
    description:
      'Night-mode gym energy: deep charcoal, electric lime, bold numbers. Built for people who track hard and train harder.',
    vibe: ['Dark', 'Bold', 'Sport', 'High energy'],
    preview: {
      bg: '#0d0f12',
      surface: '#161a20',
      primary: '#c8ff3d',
      accent: '#5eead4',
      text: '#eef2f6',
    },
  },
  {
    id: 'citrus',
    name: 'Citrus',
    tagline: 'Sunny everyday tracker',
    description:
      'Warm cream, coral-orange pops, and friendly shapes. Approachable and motivating — like a habit app you actually open at lunch.',
    vibe: ['Bright', 'Friendly', 'Warm', 'Playful'],
    preview: {
      bg: '#fff6ec',
      surface: '#ffffff',
      primary: '#f05a28',
      accent: '#ffc857',
      text: '#2b2118',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    tagline: 'Precision health data',
    description:
      'Cool neutrals, tight spacing, one clear blue accent. For power users who want macros, trends, and tables without decoration.',
    vibe: ['Minimal', 'Cool', 'Data-first', 'Crisp'],
    preview: {
      bg: '#eef1f4',
      surface: '#ffffff',
      primary: '#2563eb',
      accent: '#64748b',
      text: '#0f172a',
    },
  },
  {
    id: 'berry',
    name: 'Berry',
    tagline: 'Soft lifestyle journal',
    description:
      'Blush surfaces, plum accents, and cozy cards. A softer food-diary aesthetic that feels personal rather than like a gym spreadsheet.',
    vibe: ['Soft', 'Cozy', 'Lifestyle', 'Rounded'],
    preview: {
      bg: '#faf0f3',
      surface: '#fff9fb',
      primary: '#9b4f7a',
      accent: '#e8a0bf',
      text: '#3a2433',
    },
  },
]

export const defaultTheme: ThemeId = 'grove'
