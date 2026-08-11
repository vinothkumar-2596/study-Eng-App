import { Platform, TextStyle, ViewStyle } from 'react-native'

/**
 * Calm reading surface: a warm off-white canvas with white cards that float on
 * soft shadow rather than sitting inside hard borders. One accent (the green
 * carried over from the web app), one warning colour, nothing else.
 */
export const color = {
  canvas: '#f4f1ea',
  surface: '#ffffff',
  surfaceSunken: '#ebe8e0',

  ink: '#1d211c',
  body: '#51584f',
  muted: '#7d847a',
  faint: '#a5aaa1',

  hairline: '#e8e4dc',

  accent: '#23594d',
  accentPressed: '#173f37',
  accentSoft: '#e3efe9',
  accentInk: '#1a453b',
  highlight: '#d9e66a',
  highlightSoft: '#f1f4cb',
  charcoal: '#22251f',

  warn: '#c0603c',
  warnSoft: '#f9ece6',

  onAccent: '#ffffff',

  // Compatibility aliases keep existing screens stable while the design
  // system moves to semantic names.
  paper: '#ffffff',
  cream: '#f4f1ea',
  line: '#e8e4dc',
  lineSoft: '#efebe4',
  green: '#23594d',
  greenDark: '#173f37',
  mint: '#e3efe9',
  amber: '#c0603c',
  amberSoft: '#f9ece6',
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  huge: 56,
} as const

export const radius = {
  chip: 12,
  card: 22,
  sheet: 30,
  pill: 999,
} as const

/** Two elevation steps only. Cards rest; sheets and menus float. */
export const shadow = {
  rest: Platform.select({
    ios: {
      shadowColor: '#0f1a17',
      shadowOpacity: 0.055,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 2 },
  }) as ViewStyle,
  float: Platform.select({
    ios: {
      shadowColor: '#0f1a17',
      shadowOpacity: 0.13,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 16 },
    },
    default: { elevation: 12 },
  }) as ViewStyle,
}

/**
 * Inter carries the interface and the English reading text. Tamil gets its own
 * face rather than a fallback — it is the payload of this app, not decoration,
 * and Inter has no Tamil glyphs.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  tamil: 'NotoSansTamil_400Regular',
  tamilMedium: 'NotoSansTamil_500Medium',
  tamilSemibold: 'NotoSansTamil_600SemiBold',
} as const

export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 37, letterSpacing: -0.7, color: color.ink },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: color.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2, color: color.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: color.body },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24, color: color.ink },
  reading: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 27, color: color.body },
  caption: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: color.muted },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: color.faint,
  },
  tamil: { fontFamily: fonts.tamil, fontSize: 19, lineHeight: 32, color: color.accentInk },
  tamilSmall: { fontFamily: fonts.tamil, fontSize: 16, lineHeight: 27, color: color.accentInk },
} satisfies Record<string, TextStyle>

export const motion = {
  fast: 160,
  base: 220,
  exit: 150,
} as const

/** Every font file the app expects to be loaded before first paint. */
export const fontAssets = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  NotoSansTamil_400Regular: require('@expo-google-fonts/noto-sans-tamil/400Regular/NotoSansTamil_400Regular.ttf'),
  NotoSansTamil_500Medium: require('@expo-google-fonts/noto-sans-tamil/500Medium/NotoSansTamil_500Medium.ttf'),
  NotoSansTamil_600SemiBold: require('@expo-google-fonts/noto-sans-tamil/600SemiBold/NotoSansTamil_600SemiBold.ttf'),
}
