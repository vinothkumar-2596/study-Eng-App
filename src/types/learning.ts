// Kept structurally identical to the web app's src/types/learning.ts so saved
// words and cached analyses can be synced between the two later on.

export type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
  bottom: number
}

export type WordLearning = {
  kind: 'word'
  word: string
  tamilMeaning: string
  simpleEnglish: string
  pronunciation: string
  partOfSpeech: string
  baseForm: string
  pastForm: string
  pastParticiple: string
  alternativeWords: string[]
  contextualMeaning: string
  source?: 'ollama' | 'offline' | 'google' | 'cache'
  tamilSource?: 'google'
}

export type VerbDetail = {
  word: string
  baseForm: string
  pastForm: string
  pastParticiple: string
}

export type DifficultWord = {
  word: string
  meaning: string
}

export type SentenceLearning = {
  kind: 'sentence'
  translation: string
  simpleEnglish: string
  grammar: {
    tense: string
    explanation: string
    verbs: VerbDetail[]
  }
  difficultWords: DifficultWord[]
  source?: 'ollama' | 'offline' | 'cache'
}

export type LearningResult = WordLearning | SentenceLearning

export type LearningRequest = {
  type: 'word' | 'sentence'
  text: string
  context: string
}

export type SavedWord = WordLearning & {
  id: string
  context: string
  learned: boolean
  savedAt: string
}

export type SavedSentence = SentenceLearning & {
  id: string
  sentence: string
  savedAt: string
}

export type ReaderSelection = {
  type: 'word' | 'sentence'
  text: string
  context: string
  rect: SelectionRect
}

export type RecentBook = {
  id: string
  name: string
  fileName: string
  sizeBytes: number
  openedAt: string
  page: number
}
