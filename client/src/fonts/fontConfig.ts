export interface FontDef {
  key: string;           // stable identifier
  family: string;        // CSS font-family value (also stored in settings.font)
  googleParam: string;   // Google Fonts URL family param, e.g. 'Inter:wght@400;600'
}

// Order matters: index 0 is the default per A2.
export const FONTS: readonly FontDef[] = [
  { key: 'inter',        family: 'Inter',        googleParam: 'Inter:wght@400;600' },
  { key: 'open-sans',    family: 'Open Sans',    googleParam: 'Open+Sans:wght@400;600' },
  { key: 'dm-mono',      family: 'DM Mono',      googleParam: 'DM+Mono:wght@400;500' },
  { key: 'merriweather', family: 'Merriweather', googleParam: 'Merriweather:wght@400;700' },
  { key: 'lora',         family: 'Lora',         googleParam: 'Lora:wght@400;600' },
  { key: 'eb-garamond',  family: 'EB Garamond',  googleParam: 'EB+Garamond:wght@400;600' },
  { key: 'caveat',       family: 'Caveat',       googleParam: 'Caveat:wght@400;600' },
] as const;

export const DEFAULT_FONT_FAMILY = FONTS[0]!.family;
