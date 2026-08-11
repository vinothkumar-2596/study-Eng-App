import { Feather } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as Speech from 'expo-speech'
import { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Chip, EmptyState, IconButton, Label } from '../components/ui'
import {
  getSavedSentences,
  getSavedWords,
  removeSentence,
  removeWord,
  toggleLearned,
} from '../lib/storage'
import type { RootStackParamList } from '../navigation'
import { color, radius, space, type } from '../theme/tokens'
import type { SavedSentence, SavedWord } from '../types/learning'

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>
type Tab = 'words' | 'sentences'

export function LibraryScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('words')
  const [query, setQuery] = useState('')
  const [words, setWords] = useState<SavedWord[]>([])
  const [sentences, setSentences] = useState<SavedSentence[]>([])

  useEffect(() => {
    let active = true
    void Promise.all([getSavedWords(), getSavedSentences()]).then(([savedWords, savedSentences]) => {
      if (!active) return
      setWords(savedWords)
      setSentences(savedSentences)
    })
    return () => {
      active = false
      Speech.stop()
    }
  }, [])

  const needle = query.trim().toLowerCase()

  const visibleWords = useMemo(
    () =>
      needle
        ? words.filter(
            (word) =>
              word.word.toLowerCase().includes(needle) ||
              word.tamilMeaning.toLowerCase().includes(needle) ||
              word.simpleEnglish.toLowerCase().includes(needle),
          )
        : words,
    [needle, words],
  )

  const visibleSentences = useMemo(
    () =>
      needle
        ? sentences.filter(
            (sentence) =>
              sentence.sentence.toLowerCase().includes(needle) ||
              sentence.translation.toLowerCase().includes(needle),
          )
        : sentences,
    [needle, sentences],
  )

  const learnedCount = words.filter((word) => word.learned).length

  function confirmRemoveWord(word: SavedWord) {
    Alert.alert(`Remove “${word.word}”?`, 'It will be deleted from your saved words.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeWord(word.id).then(setWords)
        },
      },
    ])
  }

  function confirmRemoveSentence(sentence: SavedSentence) {
    Alert.alert('Remove this sentence?', 'It will be deleted from your bookmarks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeSentence(sentence.id).then(setSentences)
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={navigation.goBack} />
          <View style={styles.headerText}>
            <Label>My words</Label>
            <Text style={type.title}>
              {words.length} saved · {learnedCount} learned
            </Text>
          </View>
        </View>

        <View style={styles.search}>
          <Feather name="search" size={16} color={color.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tab === 'words' ? 'Search words or meanings' : 'Search sentences'}
            placeholderTextColor={color.faint}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabs}>
          <TabButton
            label={`Words (${words.length})`}
            active={tab === 'words'}
            onPress={() => setTab('words')}
          />
          <TabButton
            label={`Sentences (${sentences.length})`}
            active={tab === 'sentences'}
            onPress={() => setTab('sentences')}
          />
        </View>
      </View>

      {tab === 'words' ? (
        <FlatList
          data={visibleWords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="bookmark"
              title={needle ? 'Nothing matched' : 'No saved words yet'}
              body={
                needle
                  ? 'Try a different word or clear the search.'
                  : 'Tap a word while reading and save it to build your vocabulary.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.learned }}
                  accessibilityLabel={item.learned ? 'Mark as not learned' : 'Mark as learned'}
                  onPress={() => {
                    void toggleLearned(item.id).then(setWords)
                  }}
                  hitSlop={6}
                  style={[styles.check, item.learned && styles.checkOn]}
                >
                  {item.learned ? <Feather name="check" size={13} color={color.paper} /> : null}
                </Pressable>

                <View style={styles.cardHead}>
                  <Text style={[type.heading, item.learned && styles.learnedText]}>{item.word}</Text>
                  {item.partOfSpeech ? <Chip>{item.partOfSpeech}</Chip> : null}
                </View>

                <IconButton
                  icon="volume-2"
                  accessibilityLabel={`Pronounce ${item.word}`}
                  onPress={() => {
                    Speech.stop()
                    Speech.speak(item.word, { language: 'en-US', rate: 0.94 })
                  }}
                />
                <IconButton
                  icon="trash-2"
                  accessibilityLabel={`Remove ${item.word}`}
                  onPress={() => confirmRemoveWord(item)}
                />
              </View>

              <Text style={styles.tamil}>{item.tamilMeaning}</Text>
              <Text style={type.caption}>{item.simpleEnglish}</Text>
              {item.context ? (
                <Text style={styles.context} numberOfLines={2}>
                  “{item.context}”
                </Text>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={visibleSentences}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="align-left"
              title={needle ? 'Nothing matched' : 'No bookmarked sentences'}
              body={
                needle
                  ? 'Try different words or clear the search.'
                  : 'Press and hold a sentence while reading to bookmark its translation.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={[type.caption, styles.sentenceKicker]} numberOfLines={3}>
                  {item.sentence}
                </Text>
                <IconButton
                  icon="trash-2"
                  accessibilityLabel="Remove this sentence"
                  onPress={() => confirmRemoveSentence(item)}
                />
              </View>
              <Text style={styles.tamil}>{item.translation}</Text>
              {item.grammar.tense ? <Chip tone="green">{item.grammar.tense}</Chip> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.cream },
  header: {
    padding: space.lg,
    gap: space.lg,
    backgroundColor: color.paper,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1, gap: space.xs },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.cream,
    borderWidth: 1,
    borderColor: color.line,
  },
  searchInput: { flex: 1, ...type.body, fontSize: 15, paddingVertical: 0 },

  tabs: {
    flexDirection: 'row',
    gap: space.xs,
    padding: 3,
    borderRadius: radius.chip,
    backgroundColor: color.cream,
    borderWidth: 1,
    borderColor: color.line,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: 6 },
  tabActive: { backgroundColor: color.paper, borderWidth: 1, borderColor: color.line },
  tabLabel: { ...type.caption, fontWeight: '600', color: color.muted },
  tabLabelActive: { color: color.ink },

  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  card: {
    backgroundColor: color.paper,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
    gap: space.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardHead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },

  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: color.green, borderColor: color.green },
  learnedText: { color: color.muted },

  tamil: { ...type.tamilSmall, color: color.greenDark },
  context: { ...type.caption, fontSize: 12, fontStyle: 'italic', color: color.faint },
  sentenceKicker: { flex: 1, fontStyle: 'italic' },
})
