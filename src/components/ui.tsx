import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRef, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { color, radius, shadow, space, type } from '../theme/tokens'

type IconName = keyof typeof Feather.glyphMap
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function usePressMotion(disabled?: boolean) {
  const scale = useRef(new Animated.Value(1)).current

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      damping: 18,
      stiffness: 320,
      mass: 0.55,
      useNativeDriver: true,
    }).start()
  }

  return {
    animatedStyle: { transform: [{ scale }] },
    onPressIn: () => {
      if (disabled) return
      animate(0.965)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    },
    onPressOut: () => animate(1),
  }
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.label, style]}>{String(children).toUpperCase()}</Text>
}

export function Card({
  children,
  style,
  tone = 'paper',
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  tone?: 'paper' | 'mint' | 'alert'
}) {
  return <View style={[styles.card, styles[`card_${tone}`], style]}>{children}</View>
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' }) {
  return (
    <View style={[styles.chip, tone === 'green' && styles.chipGreen]}>
      <Text style={[styles.chipText, tone === 'green' && styles.chipTextGreen]}>{children}</Text>
    </View>
  )
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  busy,
  style,
}: {
  label: string
  icon?: IconName
  onPress: () => void
  disabled?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const inactive = disabled || busy
  const motion = usePressMotion(inactive)
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      onPressIn={motion.onPressIn}
      onPressOut={motion.onPressOut}
      style={[
        styles.button,
        styles.buttonPrimary,
        inactive && styles.buttonDisabled,
        style,
        motion.animatedStyle,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color.paper} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={17} color={color.paper} /> : null}
          <Text style={styles.buttonPrimaryText}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  )
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled,
  busy,
  style,
}: {
  label: string
  icon?: IconName
  onPress: () => void
  disabled?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const inactive = disabled || busy
  const motion = usePressMotion(inactive)
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      onPressIn={motion.onPressIn}
      onPressOut={motion.onPressOut}
      style={[
        styles.button,
        styles.buttonSecondary,
        inactive && styles.buttonDisabled,
        style,
        motion.animatedStyle,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color.green} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={color.ink} /> : null}
          <Text style={styles.buttonSecondaryText}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  )
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
  tone = 'neutral',
}: {
  icon: IconName
  onPress: () => void
  accessibilityLabel: string
  disabled?: boolean
  tone?: 'neutral' | 'green'
}) {
  const motion = usePressMotion(disabled)
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={motion.onPressIn}
      onPressOut={motion.onPressOut}
      hitSlop={8}
      style={[
        styles.iconButton,
        tone === 'green' && styles.iconButtonGreen,
        disabled && styles.iconButtonDisabled,
        motion.animatedStyle,
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={disabled ? color.faint : tone === 'green' ? color.paper : color.ink}
      />
    </AnimatedPressable>
  )
}

export function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Label>{label}</Label>
      <Text style={[type.title, styles.sectionTitle]}>{title}</Text>
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: IconName
  title: string
  body: string
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={22} color={color.green} />
      </View>
      <Text style={[type.heading, styles.emptyTitle]}>{title}</Text>
      <Text style={[type.caption, styles.emptyBody]}>{body}</Text>
    </View>
  )
}

export function Notice({ tone, children }: { tone: 'alert' | 'info'; children: ReactNode }) {
  return (
    <View style={[styles.notice, tone === 'alert' ? styles.noticeAlert : styles.noticeInfo]}>
      <Feather
        name={tone === 'alert' ? 'alert-triangle' : 'info'}
        size={15}
        color={tone === 'alert' ? color.amber : color.green}
      />
      <Text style={[type.caption, styles.noticeText]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.rest,
  },
  card_paper: { backgroundColor: color.paper },
  card_mint: { backgroundColor: color.mint },
  card_alert: { backgroundColor: color.amberSoft },

  divider: { height: 1, backgroundColor: color.lineSoft },

  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.cream,
    borderWidth: 1,
    borderColor: color.line,
  },
  chipGreen: { backgroundColor: color.mint, borderColor: '#c6ddd2' },
  chipText: { ...type.caption, fontSize: 12, color: color.muted },
  chipTextGreen: { color: color.greenDark, fontWeight: '600' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
  },
  buttonPrimary: { backgroundColor: color.green },
  buttonPrimaryPressed: { backgroundColor: color.greenDark },
  buttonPrimaryText: { ...type.body, fontSize: 16, fontWeight: '600', color: color.paper },
  buttonSecondary: { backgroundColor: color.paper, borderWidth: 1, borderColor: color.line },
  buttonSecondaryPressed: { backgroundColor: color.cream },
  buttonSecondaryText: { ...type.body, fontSize: 15, fontWeight: '600', color: color.ink },
  buttonDisabled: { opacity: 0.45 },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
  },
  iconButtonGreen: { backgroundColor: color.green, borderColor: color.green },
  iconButtonPressed: { opacity: 0.6 },
  iconButtonDisabled: { backgroundColor: color.cream, borderColor: color.lineSoft },

  sectionHeading: { gap: space.sm, marginBottom: space.lg },
  sectionTitle: { marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.md },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center', maxWidth: 280 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  noticeAlert: { backgroundColor: color.amberSoft, borderColor: '#f0cfc3' },
  noticeInfo: { backgroundColor: color.mint, borderColor: '#c6ddd2' },
  noticeText: { flex: 1, color: color.ink },
})
