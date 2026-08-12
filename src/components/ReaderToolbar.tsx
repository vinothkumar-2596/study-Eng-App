import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { IconButton } from './ui'
import { color, radius, space, type } from '../theme/tokens'

type Props = {
  title: string
  page: number
  pages: number
  zoom: number
  fitMode: 'width' | 'page'
  savedCount: number
  onBack: () => void
  onOpenLibrary: () => void
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onFitModeChange: (mode: 'width' | 'page') => void
}

const MIN_ZOOM = 0.6
const MAX_ZOOM = 2.6
const STEP = 0.2

export function ReaderToolbar({
  title,
  page,
  pages,
  zoom,
  fitMode,
  savedCount,
  onBack,
  onOpenLibrary,
  onPageChange,
  onZoomChange,
  onFitModeChange,
}: Props) {
  const [controlsOpen, setControlsOpen] = useState(true)
  const round = (value: number) => Math.round(value * 100) / 100
  const progress = pages ? Math.min(1, Math.max(0, page / pages)) : 0

  return (
    <View style={styles.root}>
      <View style={[styles.row, styles.headerRow]}>
        <IconButton icon="chevron-left" accessibilityLabel="Close this book" onPress={onBack} />
        <Text style={[type.heading, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open my words"
            onPress={onOpenLibrary}
            onPressIn={() => void Haptics.selectionAsync()}
            hitSlop={6}
            style={({ pressed }) => [styles.libraryButton, pressed && styles.pressed]}
          >
            <Feather name="bookmark" size={15} color={color.ink} />
            <Text style={styles.libraryCount}>{savedCount}</Text>
          </Pressable>
          <IconButton
            icon={controlsOpen ? 'chevron-up' : 'sliders'}
            accessibilityLabel={controlsOpen ? 'Hide reader controls' : 'Show reader controls'}
            onPress={() => setControlsOpen((open) => !open)}
          />
        </View>
      </View>

      {controlsOpen ? <View style={[styles.row, styles.controls]}>
        <View style={styles.pager}>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="Previous page"
            disabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
          />
          <Text style={styles.pageLabel}>
            {page}
            <Text style={styles.pageTotal}> / {pages || '—'}</Text>
          </Text>
          <IconButton
            icon="chevron-right"
            accessibilityLabel="Next page"
            disabled={!pages || page >= pages}
            onPress={() => onPageChange(page + 1)}
          />
        </View>

        <View style={styles.spacer} />

        <View style={styles.zoomGroup}>
          <IconButton
            icon="minus"
            accessibilityLabel="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onPress={() => onZoomChange(round(Math.max(MIN_ZOOM, zoom - STEP)))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fitMode === 'width' ? 'Fit whole page' : 'Fit page width'}
            onPress={() => onFitModeChange(fitMode === 'width' ? 'page' : 'width')}
            onPressIn={() => void Haptics.selectionAsync()}
            style={({ pressed }) => [styles.fitButton, pressed && styles.pressed]}
          >
            <Feather
              name={fitMode === 'width' ? 'maximize-2' : 'minimize-2'}
              size={14}
              color={color.ink}
            />
            <Text style={styles.fitLabel}>{fitMode === 'width' ? 'Width' : 'Page'}</Text>
          </Pressable>
          <IconButton
            icon="plus"
            accessibilityLabel="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onPress={() => onZoomChange(round(Math.min(MAX_ZOOM, zoom + STEP)))}
          />
        </View>
      </View> : null}
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: pages || 1, now: page }}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.canvas,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerRow: { minHeight: 44 },
  title: { flex: 1, textAlign: 'center', fontSize: 15 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },

  controls: {
    minHeight: 54,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: 18,
    backgroundColor: color.paper,
  },

  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.surfaceSunken,
  },
  libraryCount: { ...type.caption, fontWeight: '600', color: color.ink },
  pressed: { opacity: 0.6 },

  pager: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pageLabel: { ...type.body, fontWeight: '600', minWidth: 68, textAlign: 'center' },
  pageTotal: { ...type.body, fontWeight: '400', color: color.muted },

  spacer: { flex: 1 },

  zoomGroup: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  fitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.surfaceSunken,
  },
  fitLabel: { ...type.caption, fontWeight: '600', color: color.ink },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: color.surfaceSunken, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: color.accent },
})
