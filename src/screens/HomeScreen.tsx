import { Feather } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '../components/ui'
import { bookExists, PdfSourceError, pickPdf } from '../lib/pdfSource'
import { forgetBook, getRecentBooks, getSavedSentences, getSavedWords, rememberBook } from '../lib/storage'
import type { RootStackParamList } from '../navigation'
import { color, fonts, radius, shadow, space, type } from '../theme/tokens'
import type { RecentBook } from '../types/learning'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const COVER_COLORS = ['#2a312b', '#a74f35', '#6c7565', '#d5a84b', '#405d62']

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PDF'
}

export function HomeScreen({ navigation }: Props) {
  const [books, setBooks] = useState<RecentBook[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [sentenceCount, setSentenceCount] = useState(0)
  const [picking, setPicking] = useState(false)

  const refresh = useCallback(() => {
    let active = true
    void Promise.all([getRecentBooks(), getSavedWords(), getSavedSentences()]).then(
      ([recent, words, sentences]) => {
        if (!active) return
        setBooks(recent)
        setWordCount(words.length)
        setSentenceCount(sentences.length)
      },
    )
    return () => {
      active = false
    }
  }, [])

  useFocusEffect(refresh)
  const currentBook = books[0]
  const shelf = books.slice(currentBook ? 1 : 0)

  async function choosePdf() {
    setPicking(true)
    try {
      const book = await pickPdf()
      if (!book) return
      setBooks(await rememberBook(book))
      navigation.navigate('Reader', { book })
    } catch (error) {
      Alert.alert(
        'Could not open that file',
        error instanceof PdfSourceError ? error.message : 'Please try a different PDF.',
      )
    } finally {
      setPicking(false)
    }
  }

  async function openBook(book: RecentBook) {
    if (await bookExists(book)) {
      navigation.navigate('Reader', { book })
      return
    }
    setBooks(await forgetBook(book.id))
    Alert.alert('That book is gone', 'Choose the PDF again to add it back to your shelf.')
  }

  function removeBook(book: RecentBook) {
    Alert.alert('Remove this book?', `“${book.name}” will be removed from your shelf.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void forgetBook(book.id).then(setBooks) },
    ])
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search saved learning"
            onPress={() => navigation.navigate('Library')}
            style={({ pressed }) => [styles.topAction, pressed && styles.pressed]}
          >
            <Feather name="search" size={18} color={color.ink} />
          </Pressable>

          <View style={styles.brandMark}>
            <Feather name="book-open" size={17} color={color.charcoal} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.topAction, pressed && styles.pressed]}
          >
            <Feather name="more-horizontal" size={20} color={color.ink} />
          </Pressable>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>{greeting()}</Text>
          <Text style={styles.greetingCopy}>
            {books.length ? 'Pick up where you left off.' : 'Your calm space to read and learn.'}
          </Text>
        </View>

        {currentBook ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reading now</Text>
              <Text style={styles.sectionMeta}>Page {currentBook.page || 1}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continue ${currentBook.name}`}
              onPress={() => void openBook(currentBook)}
              onLongPress={() => removeBook(currentBook)}
              style={({ pressed }) => [styles.featureCard, pressed && styles.cardPressed]}
            >
              <BookCover book={currentBook} index={0} large />
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle} numberOfLines={3}>{currentBook.name}</Text>
                <Text style={styles.featureCaption}>Saved on this device</Text>
                <View style={styles.featureFooter}>
                  <View style={styles.pagePill}>
                    <Text style={styles.pagePillText}>PAGE {currentBook.page || 1}</Text>
                  </View>
                  <View style={styles.playButton}>
                    <Feather name="play" size={17} color={color.paper} style={styles.playIcon} />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyArtwork}>
              <Feather name="book" size={28} color={color.accent} />
            </View>
            <Text style={styles.emptyTitle}>Start with a good book</Text>
            <Text style={styles.emptyCopy}>Open an English PDF. Tap a word for a quick Tamil meaning.</Text>
            <PrimaryButton label="Choose PDF" icon="plus" onPress={choosePdf} busy={picking} style={styles.emptyButton} />
          </View>
        )}

        {shelf.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your shelf</Text>
              <Text style={styles.sectionMeta}>{books.length} books</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
              {shelf.map((book, index) => (
                <Pressable
                  key={book.id}
                  accessibilityRole="button"
                  onPress={() => void openBook(book)}
                  onLongPress={() => removeBook(book)}
                  style={({ pressed }) => [styles.shelfBook, pressed && styles.pressed]}
                >
                  <BookCover book={book} index={index + 1} />
                  <Text style={styles.shelfTitle} numberOfLines={2}>{book.name}</Text>
                  <Text style={styles.shelfMeta}>Page {book.page || 1}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Library')}
            style={({ pressed }) => [styles.learningCard, pressed && styles.cardPressed]}
          >
            <View style={styles.learningIcon}><Feather name="bookmark" size={18} color={color.accent} /></View>
            <View style={styles.learningBody}>
              <Text style={styles.learningTitle}>My learning</Text>
              <Text style={styles.learningMeta}>{wordCount} words · {sentenceCount} sentences</Text>
            </View>
            <Feather name="chevron-right" size={18} color={color.faint} />
          </Pressable>

          {currentBook ? (
            <PrimaryButton label="Add another PDF" icon="plus" onPress={choosePdf} busy={picking} />
          ) : null}
        </View>

        <Text style={styles.privacy}>Your PDFs and saved learning stay on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function BookCover({ book, index, large = false }: { book: RecentBook; index: number; large?: boolean }) {
  return (
    <View style={[styles.cover, large ? styles.coverLarge : styles.coverSmall, { backgroundColor: COVER_COLORS[index % COVER_COLORS.length] }]}>
      <View style={styles.coverRule} />
      <Text style={[styles.coverInitials, large && styles.coverInitialsLarge]}>{initials(book.name)}</Text>
      <Text style={styles.coverLabel}>STUDY · ENG</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.xl, paddingBottom: space.huge, gap: space.xxl },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  brandMark: { width: 39, height: 39, borderRadius: 13, backgroundColor: color.highlight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  pressed: { opacity: 0.55 },
  greeting: { gap: 5 },
  greetingTitle: { fontFamily: fonts.semibold, fontSize: 29, lineHeight: 36, letterSpacing: -0.7, color: color.ink },
  greetingCopy: { ...type.caption, fontSize: 14.5, color: color.muted },
  section: { gap: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 16, color: color.ink },
  sectionMeta: { ...type.caption, fontSize: 12, color: color.faint },
  featureCard: { minHeight: 194, flexDirection: 'row', gap: space.xl, padding: space.lg, borderRadius: 26, backgroundColor: color.paper, ...shadow.rest },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.86 },
  cover: { overflow: 'hidden', padding: 12, justifyContent: 'space-between', borderRadius: 7, ...shadow.rest },
  coverLarge: { width: 105, height: 154 },
  coverSmall: { width: 94, height: 132 },
  coverRule: { width: 20, height: 2, backgroundColor: color.highlight },
  coverInitials: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26, color: color.paper, letterSpacing: -0.5 },
  coverInitialsLarge: { fontSize: 27, lineHeight: 31 },
  coverLabel: { fontFamily: fonts.semibold, fontSize: 7, letterSpacing: 1.3, color: 'rgba(255,255,255,0.72)' },
  featureBody: { flex: 1, paddingVertical: 4 },
  featureTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.35, color: color.ink },
  featureCaption: { ...type.caption, marginTop: 7 },
  featureFooter: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  pagePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.surfaceSunken },
  pagePillText: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 0.8, color: color.muted },
  playButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.charcoal, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
  shelf: { gap: space.lg, paddingRight: space.xl },
  shelfBook: { width: 100, gap: 7 },
  shelfTitle: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: color.ink },
  shelfMeta: { ...type.caption, fontSize: 11, color: color.faint },
  emptyCard: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xxl, borderRadius: 26, backgroundColor: color.paper, ...shadow.rest },
  emptyArtwork: { width: 64, height: 64, borderRadius: 22, backgroundColor: color.highlightSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...type.title, textAlign: 'center' },
  emptyCopy: { ...type.caption, textAlign: 'center', maxWidth: 280 },
  emptyButton: { alignSelf: 'stretch', marginTop: space.sm },
  actions: { gap: space.md },
  learningCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: 20, backgroundColor: color.paper, ...shadow.rest },
  learningIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  learningBody: { flex: 1, gap: 2 },
  learningTitle: { fontFamily: fonts.semibold, fontSize: 15, color: color.ink },
  learningMeta: { ...type.caption, fontSize: 12.5 },
  privacy: { ...type.caption, fontSize: 11, color: color.faint, textAlign: 'center' },
})
