import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, motion, radius, shadow, space } from '../theme/tokens'

/**
 * Built on core Animated + PanResponder rather than a gesture library: the app
 * only needs one sheet, and this keeps the dependency list to what Expo Go ships
 * with. Drag is bound to the header so the scrollable body stays untouched.
 */
export function BottomSheet({
  visible,
  onClose,
  header,
  compact = false,
  children,
}: {
  visible: boolean
  onClose: () => void
  header?: ReactNode
  compact?: boolean
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  const [windowHeight, setWindowHeight] = useState(() => Dimensions.get('window').height)

  const expandedHeight = Math.round(windowHeight * 0.88)
  const restingHeight = windowHeight * (compact ? 0.42 : 0.56)
  const restingOffset = Math.round(expandedHeight - restingHeight)

  const translateY = useRef(new Animated.Value(expandedHeight)).current
  const backdrop = useRef(new Animated.Value(0)).current
  const offset = useRef(expandedHeight)
  const dragStart = useRef(0)

  useEffect(() => {
    const listener = translateY.addListener(({ value }) => {
      offset.current = value
    })
    return () => translateY.removeListener(listener)
  }, [translateY])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowHeight(window.height)
    })
    return () => subscription.remove()
  }, [])

  const animateTo = useCallback(
    (value: number, then?: () => void) => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: value,
          damping: 24,
          stiffness: 260,
          mass: 0.8,
          overshootClamping: value >= expandedHeight,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: value >= expandedHeight ? 0 : 1,
          duration: motion.base,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && then) then()
      })
    },
    [backdrop, expandedHeight, translateY],
  )

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateY.setValue(expandedHeight)
      requestAnimationFrame(() => animateTo(restingOffset))
    } else if (mounted) {
      animateTo(expandedHeight, () => setMounted(false))
    }
    // `mounted` intentionally excluded: it is the effect's own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expandedHeight, restingOffset])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          dragStart.current = offset.current
          translateY.stopAnimation()
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
        },
        onPanResponderMove: (_event, gesture) => {
          const next = Math.min(expandedHeight, Math.max(0, dragStart.current + gesture.dy))
          translateY.setValue(next)
        },
        onPanResponderRelease: (_event, gesture) => {
          const position = offset.current
          const flickingDown = gesture.vy > 0.8
          const flickingUp = gesture.vy < -0.8
          void Haptics.selectionAsync()

          if (flickingDown && position > restingOffset - 40) {
            animateTo(expandedHeight, onClose)
            return
          }
          if (flickingUp) {
            animateTo(0)
            return
          }
          if (position > restingOffset + 90) {
            animateTo(expandedHeight, onClose)
            return
          }
          animateTo(position < restingOffset / 2 ? 0 : restingOffset)
        },
      }),
    [animateTo, expandedHeight, onClose, restingOffset, translateY],
  )

  if (!mounted) return null

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            shadow.float,
            { height: expandedHeight, paddingBottom: insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <View {...pan.panHandlers} style={styles.grabArea}>
            <View style={styles.grabber} />
            {header}
          </View>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28, 41, 38, 0.32)' },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  grabArea: { paddingTop: space.sm, paddingHorizontal: space.xl, paddingBottom: space.md },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    marginBottom: space.md,
  },
  body: { flex: 1 },
})
