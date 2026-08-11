import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BottomSheet } from './BottomSheet'
import { Card, Chip, Label, Notice, PrimaryButton } from './ui'
import { color, radius, space, type } from '../theme/tokens'
import type { LearningResult, ReaderSelection, SentenceLearning, WordLearning } from '../types/learning'

type Props = {
  selection: ReaderSelection | null
  result: LearningResult | null
  loading: boolean
  error: string
  onClose: () => void
  onSaveWord: (word: WordLearning) => void
  onSaveSentence: (sentence: SentenceLearning) => void
}

export function LearningSheet({
  selection,
  result,
  loading,
  error,
  onClose,
  onSaveWord,
  onSaveSentence,
}: Props) {
  const [saved, setSaved] = useState(false)
  const isSentence = selection?.type === 'sentence'

  useEffect(() => {
    setSaved(false)
  }, [selection?.text, selection?.type])

  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [])

  function speak() {
    if (!selection) return
    Speech.stop()
    Speech.speak(selection.text, { language: 'en-US', rate: 0.94 })
  }

  function save() {
    if (!result) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (result.kind === 'word') onSaveWord(result)
    else onSaveSentence(result)
    setSaved(true)
  }

  return (
    <BottomSheet
      visible={Boolean(selection)}
      onClose={onClose}
      header={
        <View style={styles.header}>
          <Label>{isSentence ? 'Sentence explainer' : 'Word meaning'}</Label>
          <View style={styles.headerActions}>
            {!isSentence && selection ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pronounce word"
                onPress={speak}
                hitSlop={8}
                style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
              >
                <Feather name="volume-2" size={17} color={color.green} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close explanation"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            >
              <Feather name="x" size={17} color={color.muted} />
            </Pressable>
          </View>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={color.green} />
            <Text style={type.caption}>Finding the clearest explanation…</Text>
          </View>
        ) : null}

        {error ? (
          <Card tone="alert" style={styles.errorCard}>
            <Text style={[type.heading, styles.errorTitle]}>Couldn’t analyze this</Text>
            <Text style={type.caption}>{error}</Text>
          </Card>
        ) : null}

        {result?.kind === 'word' ? <WordBody result={result} /> : null}
        {result?.kind === 'sentence' && selection ? (
          <SentenceBody result={result} sentence={selection.text} />
        ) : null}

        {result ? (
          <PrimaryButton
            label={
              saved
                ? result.kind === 'word'
                  ? 'Saved to My Words'
                  : 'Sentence bookmarked'
                : result.kind === 'word'
                  ? 'Save this word'
                  : 'Bookmark sentence'
            }
            icon={saved ? 'check' : result.kind === 'word' ? 'plus' : 'bookmark'}
            onPress={save}
            disabled={saved}
            style={styles.saveButton}
          />
        ) : null}

        {result?.source === 'offline' && !(result.kind === 'word' && result.tamilSource === 'google') ? (
          <Text style={styles.footnote}>
            Built-in dictionary result · add a local Ollama in Settings for wider coverage
          </Text>
        ) : null}
        {result?.kind === 'word' && result.tamilSource === 'google' ? (
          <Text style={styles.footnote}>
            Tamil meaning from Google Translate · only the selected word was sent
          </Text>
        ) : null}
        {result?.source === 'ollama' && !(result.kind === 'word' && result.tamilSource === 'google') ? (
          <Text style={styles.footnote}>Generated on your own machine · your PDF stayed on this device</Text>
        ) : null}
        {result?.source === 'cache' ? <Text style={styles.footnote}>Saved from an earlier lookup</Text> : null}
      </ScrollView>
    </BottomSheet>
  )
}

function WordBody({ result }: { result: WordLearning }) {
  const alternatives = result.alternativeWords.filter(
    (word) => word.toLocaleLowerCase() !== result.word.toLocaleLowerCase(),
  )
  const hasForms = Boolean(result.baseForm || result.pastForm || result.pastParticiple)
  const showContext = Boolean(result.contextualMeaning) && result.contextualMeaning !== result.simpleEnglish

  return (
    <View style={styles.stack}>
      <View style={styles.wordTitleRow}>
        <Text style={[type.display, styles.wordTitle]}>{result.word}</Text>
        {result.partOfSpeech ? <Chip>{result.partOfSpeech}</Chip> : null}
      </View>
      {result.pronunciation ? (
        <Text style={styles.pronunciation}>/{result.pronunciation}/</Text>
      ) : null}

      <Card tone="mint" style={styles.block}>
        <Label>Tamil meaning</Label>
        <Text style={[type.reading, styles.tamil]}>{result.tamilMeaning}</Text>
      </Card>

      {hasForms ? (
        <Card style={styles.block}>
          <Label>Verb forms</Label>
          <View style={styles.formRow}>
            {result.baseForm ? <Form label="Base" value={result.baseForm} /> : null}
            {result.pastForm ? <Form label="Past" value={result.pastForm} /> : null}
            {result.pastParticiple ? <Form label="Past participle" value={result.pastParticiple} /> : null}
          </View>
        </Card>
      ) : null}

      <View style={styles.block}>
        <Label>Simple English</Label>
        <Text style={type.reading}>{result.simpleEnglish}</Text>
      </View>

      {alternatives.length ? (
        <View style={styles.block}>
          <Label>Alternative words</Label>
          <View style={styles.chipRow}>
            {alternatives.map((word) => (
              <Chip key={word}>{word}</Chip>
            ))}
          </View>
        </View>
      ) : null}

      {showContext ? (
        <View style={styles.block}>
          <Label>In this sentence</Label>
          <Text style={type.reading}>{result.contextualMeaning}</Text>
        </View>
      ) : null}
    </View>
  )
}

function SentenceBody({ result, sentence }: { result: SentenceLearning; sentence: string }) {
  return (
    <View style={styles.stack}>
      <View style={styles.quote}>
        <Text style={[type.reading, styles.quoteText]}>{sentence}</Text>
      </View>

      <Card tone="mint" style={styles.block}>
        <Label>Tamil translation</Label>
        <Text style={[type.reading, styles.tamil]}>{result.translation}</Text>
      </Card>

      <View style={styles.block}>
        <Label>Simple English</Label>
        <Text style={type.reading}>{result.simpleEnglish}</Text>
      </View>

      <Card style={styles.block}>
        <View style={styles.grammarHead}>
          <Label>Grammar</Label>
          {result.grammar.tense ? <Chip tone="green">{result.grammar.tense}</Chip> : null}
        </View>
        <Text style={type.body}>{result.grammar.explanation}</Text>
        {result.grammar.verbs.length ? (
          <View style={styles.verbList}>
            {result.grammar.verbs.map((verb, index) => (
              <View key={`${verb.word}-${index}`} style={styles.verbItem}>
                <Text style={[type.heading, styles.verbWord]}>{verb.word}</Text>
                <View style={styles.formRow}>
                  <Form label="Base" value={verb.baseForm || '—'} />
                  <Form label="Past" value={verb.pastForm || '—'} />
                  <Form label="Past participle" value={verb.pastParticiple || '—'} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {result.difficultWords.length ? (
        <View style={styles.block}>
          <Label>Useful words</Label>
          <View style={styles.usefulList}>
            {result.difficultWords.map((word, index) => (
              <View key={`${word.word}-${index}`} style={styles.usefulRow}>
                <Text style={[type.body, styles.usefulWord]}>{word.word}</Text>
                <Text style={[type.caption, styles.usefulMeaning]}>{word.meaning}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

function Form({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.form}>
      <Text style={type.label}>{label.toUpperCase()}</Text>
      <Text style={[type.body, styles.formValue]}>{value}</Text>
    </View>
  )
}

export function SelectionTooLongNotice({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <View style={styles.toast}>
      <Notice tone="alert">Please select a shorter sentence (under 700 characters).</Notice>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: space.sm },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.cream,
  },
  headerButtonPressed: { opacity: 0.6 },

  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.lg },
  stack: { gap: space.lg },
  block: { gap: space.sm },

  loading: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  errorCard: { gap: space.xs },
  errorTitle: { marginBottom: 2 },

  wordTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  wordTitle: { flexShrink: 1 },
  pronunciation: { ...type.body, color: color.muted, marginTop: -space.sm },
  tamil: { ...type.tamil, color: color.greenDark },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  form: { gap: 3 },
  formValue: { fontWeight: '600' },

  quote: {
    borderLeftWidth: 3,
    borderLeftColor: color.green,
    paddingLeft: space.md,
    paddingVertical: space.xs,
  },
  quoteText: { fontStyle: 'italic', color: color.muted },

  grammarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  verbList: { gap: space.md, marginTop: space.sm },
  verbItem: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  verbWord: {},

  usefulList: { gap: space.md },
  usefulRow: { gap: 2 },
  usefulWord: { fontWeight: '600' },
  usefulMeaning: {},

  saveButton: { marginTop: space.sm },
  footnote: { ...type.caption, fontSize: 12, textAlign: 'center', color: color.faint },

  toast: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xxl },
})
