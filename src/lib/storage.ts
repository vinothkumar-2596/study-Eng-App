import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { RecentBook, SavedSentence, SavedWord, SentenceLearning, WordLearning } from '../types/learning'

// Same keys and record shapes as the web app's src/lib/storage.ts — only the
// storage backend changes, so the two can be reconciled later.
const WORDS_KEY = 'readwise-tamil:words'
const SENTENCES_KEY = 'readwise-tamil:sentences'
const BOOKS_KEY = 'study-eng:books'

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

export function getSavedWords() {
  return readJson<SavedWord[]>(WORDS_KEY, [])
}

export async function saveWord(word: WordLearning, context: string) {
  const words = await getSavedWords()
  const existing = words.findIndex((item) => item.word.toLowerCase() === word.word.toLowerCase())
  const saved: SavedWord = {
    ...word,
    id: existing >= 0 ? words[existing].id : randomUUID(),
    context,
    learned: existing >= 0 ? words[existing].learned : false,
    savedAt: new Date().toISOString(),
  }
  if (existing >= 0) words[existing] = saved
  else words.unshift(saved)
  await writeJson(WORDS_KEY, words)
  return words
}

export async function toggleLearned(id: string) {
  const words = (await getSavedWords()).map((word) =>
    word.id === id ? { ...word, learned: !word.learned } : word,
  )
  await writeJson(WORDS_KEY, words)
  return words
}

export async function removeWord(id: string) {
  const words = (await getSavedWords()).filter((word) => word.id !== id)
  await writeJson(WORDS_KEY, words)
  return words
}

export function getSavedSentences() {
  return readJson<SavedSentence[]>(SENTENCES_KEY, [])
}

export async function saveSentence(sentence: string, result: SentenceLearning) {
  const sentences = await getSavedSentences()
  const normalized = sentence.trim().toLowerCase()
  if (sentences.some((item) => item.sentence.trim().toLowerCase() === normalized)) {
    return sentences
  }
  const saved: SavedSentence = {
    ...result,
    id: randomUUID(),
    sentence,
    savedAt: new Date().toISOString(),
  }
  const next = [saved, ...sentences]
  await writeJson(SENTENCES_KEY, next)
  return next
}

export async function removeSentence(id: string) {
  const sentences = (await getSavedSentences()).filter((sentence) => sentence.id !== id)
  await writeJson(SENTENCES_KEY, sentences)
  return sentences
}

export function getRecentBooks() {
  return readJson<RecentBook[]>(BOOKS_KEY, [])
}

export async function rememberBook(book: Omit<RecentBook, 'openedAt'>) {
  const books = (await getRecentBooks()).filter((item) => item.id !== book.id)
  const next = [{ ...book, openedAt: new Date().toISOString() }, ...books].slice(0, 12)
  await writeJson(BOOKS_KEY, next)
  return next
}

export async function updateBookPage(id: string, page: number) {
  const books = await getRecentBooks()
  const index = books.findIndex((book) => book.id === id)
  if (index < 0) return books
  books[index] = { ...books[index], page }
  await writeJson(BOOKS_KEY, books)
  return books
}

export async function forgetBook(id: string) {
  const books = (await getRecentBooks()).filter((book) => book.id !== id)
  await writeJson(BOOKS_KEY, books)
  return books
}
