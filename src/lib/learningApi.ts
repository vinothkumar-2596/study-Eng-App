import AsyncStorage from '@react-native-async-storage/async-storage'
import { z } from 'zod'
import { currentSettings } from './settings'
import type { LearningRequest, LearningResult } from '../types/learning'

// Schemas, prompts and cache keys are kept identical to the web app so both
// clients validate the same shapes and share the same cache identity.

const wordSchema = z.object({
  kind: z.literal('word'),
  word: z.string(),
  tamilMeaning: z.string(),
  simpleEnglish: z.string(),
  pronunciation: z.string(),
  partOfSpeech: z.string(),
  baseForm: z.string(),
  pastForm: z.string(),
  pastParticiple: z.string(),
  alternativeWords: z.array(z.string()).max(5).default([]),
  contextualMeaning: z.string(),
  source: z.enum(['ollama', 'offline', 'google', 'cache']).optional(),
  tamilSource: z.literal('google').optional(),
})

const sentenceSchema = z.object({
  kind: z.literal('sentence'),
  translation: z.string(),
  simpleEnglish: z.string(),
  grammar: z.object({
    tense: z.string(),
    explanation: z.string(),
    verbs: z.array(
      z.object({
        word: z.string(),
        baseForm: z.string(),
        pastForm: z.string(),
        pastParticiple: z.string(),
      }),
    ),
  }),
  difficultWords: z.array(
    z.object({
      word: z.string(),
      meaning: z.string(),
    }),
  ),
  source: z.enum(['ollama', 'offline', 'cache']).optional(),
})

const resultSchema = z.discriminatedUnion('kind', [wordSchema, sentenceSchema])
const CACHE_ROOT = 'readwise-tamil:analysis:'
const CACHE_PREFIX = `${CACHE_ROOT}v2:`

const wordJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'word', 'tamilMeaning', 'simpleEnglish', 'pronunciation', 'partOfSpeech', 'baseForm', 'pastForm', 'pastParticiple', 'alternativeWords', 'contextualMeaning'],
  properties: {
    kind: { type: 'string', enum: ['word'] },
    word: { type: 'string' },
    tamilMeaning: { type: 'string' },
    simpleEnglish: { type: 'string' },
    pronunciation: { type: 'string' },
    partOfSpeech: { type: 'string' },
    baseForm: { type: 'string' },
    pastForm: { type: 'string' },
    pastParticiple: { type: 'string' },
    alternativeWords: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    contextualMeaning: { type: 'string' },
  },
} as const

const sentenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'translation', 'simpleEnglish', 'grammar', 'difficultWords'],
  properties: {
    kind: { type: 'string', enum: ['sentence'] },
    translation: { type: 'string' },
    simpleEnglish: { type: 'string' },
    grammar: {
      type: 'object',
      additionalProperties: false,
      required: ['tense', 'explanation', 'verbs'],
      properties: {
        tense: { type: 'string' },
        explanation: { type: 'string' },
        verbs: {
          type: 'array',
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['word', 'baseForm', 'pastForm', 'pastParticiple'],
            properties: {
              word: { type: 'string' },
              baseForm: { type: 'string' },
              pastForm: { type: 'string' },
              pastParticiple: { type: 'string' },
            },
          },
        },
      },
    },
    difficultWords: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'meaning'],
        properties: { word: { type: 'string' }, meaning: { type: 'string' } },
      },
    },
  },
} as const

const WORD_PROMPT = 'You are an English-to-Tamil vocabulary tutor. Use the nearby sentence only to disambiguate the selected word. tamilMeaning must be exactly one direct, natural Tamil translation of the selected word, like a bilingual dictionary or Google Translate. Never put alternatives, slashes, transliteration, English, or an explanation in tamilMeaning. Put the sentence-specific explanation only in contextualMeaning. alternativeWords must contain 3 to 5 short English alternatives that fit this exact context; never include the selected word itself. Never repeat phrases or output instructions. Keep simple English concise. Give easy English-syllable pronunciation. For a verb, fill all verb forms; otherwise use empty strings. Return only the required structured data.'
const SENTENCE_PROMPT = 'You are an English-to-Tamil grammar tutor. Translate every subject, action, negation, and time marker faithfully. Never summarize, add, remove, or invent meaning. Preserve tense and aspect. Keep English and grammar explanations brief and beginner-friendly. Return only the required structured data.'

function hash(value: string) {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

function cacheKey(request: LearningRequest) {
  return `${CACHE_PREFIX}${hash(`${request.type}|${request.text.toLowerCase()}|${request.context.toLowerCase()}`)}`
}

export async function analyzeText(request: LearningRequest, signal?: AbortSignal): Promise<LearningResult> {
  const key = cacheKey(request)
  const cached = await AsyncStorage.getItem(key)
  if (cached) {
    try {
      return { ...resultSchema.parse(JSON.parse(cached)), source: 'cache' }
    } catch {
      await AsyncStorage.removeItem(key)
    }
  }

  const { apiUrl, ollamaUrl } = currentSettings()
  const googleWordPromise = request.type === 'word' ? fetchGoogleWordDetails(request.text, signal) : null
  const candidates: Promise<LearningResult>[] = []

  // Race independent sources so a sleeping local model can never hold up a
  // direct word meaning. The Google result is also used to normalize Tamil when
  // an enriched Ollama/API result wins first.
  if (googleWordPromise) {
    candidates.push(
      googleWordPromise.then(async (details) => {
        if (!details) throw new Error('Google word lookup is unavailable.')
        // Give a warm API/model a brief chance to return richer contextual
        // details and alternatives, without making the direct meaning feel slow.
        await pause(650, signal)
        return createGoogleWordResult(request.text, details)
      }),
    )
  }
  if (ollamaUrl) candidates.push(analyzeWithOllama(request, signal))
  if (apiUrl) candidates.push(analyzeWithApi(request, signal))

  if (!candidates.length) {
    throw new Error('No lookup source is configured. Open Settings and add a server address.')
  }

  const result = await firstSuccessful(candidates, signal)
  const finalResult = await applyGoogleTamil(result, googleWordPromise)
  await AsyncStorage.setItem(key, JSON.stringify(finalResult))
  return finalResult
}

function pause(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Lookup cancelled.'))
      return
    }
    const finish = () => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    const cancel = () => {
      clearTimeout(timer)
      reject(new Error('Lookup cancelled.'))
    }
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

async function firstSuccessful<T>(candidates: Promise<T>[], signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    let failures = 0
    let firstError: unknown

    candidates.forEach((candidate) => {
      candidate.then(resolve).catch((error: unknown) => {
        if (signal?.aborted) {
          reject(error)
          return
        }
        firstError ??= error
        failures += 1
        if (failures === candidates.length) {
          reject(firstError instanceof Error ? firstError : new Error('Unable to analyze this right now. Please try again.'))
        }
      })
    })
  })
}

type GoogleWordDetails = {
  translation: string
  partOfSpeech: string
  definition: string
  baseForm: string
  alternatives: string[]
}

function createGoogleWordResult(word: string, details: GoogleWordDetails): LearningResult {
  return {
    kind: 'word',
    word,
    tamilMeaning: details.translation,
    simpleEnglish: details.definition || `The direct meaning of “${word}”.`,
    pronunciation: '',
    partOfSpeech: details.partOfSpeech || 'word',
    baseForm: details.baseForm,
    pastForm: '',
    pastParticiple: '',
    alternativeWords: details.alternatives,
    contextualMeaning: details.definition,
    source: 'google',
    tamilSource: 'google',
  }
}

async function applyGoogleTamil(
  result: LearningResult,
  googleWordPromise: Promise<GoogleWordDetails | null> | null,
) {
  if (result.kind !== 'word' || !googleWordPromise) return result
  const details = await googleWordPromise
  if (!details) return result
  return {
    ...result,
    tamilMeaning: details.translation,
    alternativeWords: result.alternativeWords.length ? result.alternativeWords : details.alternatives,
    tamilSource: 'google' as const,
  }
}

async function fetchGoogleWordDetails(
  word: string,
  externalSignal?: AbortSignal,
): Promise<GoogleWordDetails | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  const cancel = () => controller.abort()
  if (externalSignal?.aborted) controller.abort()
  else externalSignal?.addEventListener('abort', cancel, { once: true })

  try {
    const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'ta', hl: 'en', dj: '1', q: word.trim() })
    params.append('dt', 't')
    params.append('dt', 'bd')
    params.append('dt', 'md')
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      sentences?: Array<{ trans?: string }>
      dict?: Array<{ pos?: string; base_form?: string; entry?: Array<{ reverse_translation?: string[] }> }>
      definitions?: Array<{ pos?: string; base_form?: string; entry?: Array<{ gloss?: string }> }>
    }
    const translation = data.sentences?.map((sentence) => sentence.trans ?? '').join('').trim() ?? ''
    if (!translation) return null
    const dictionary = data.dict?.[0]
    const definitionGroup = data.definitions?.find((group) => group.pos === dictionary?.pos) ?? data.definitions?.[0]
    const baseForm = dictionary?.base_form ?? definitionGroup?.base_form ?? ''
    const grammaticalDefinition =
      baseForm && baseForm.toLocaleLowerCase() !== word.toLocaleLowerCase()
        ? definitionGroup?.entry?.find((entry) => {
            const gloss = entry.gloss?.toLocaleLowerCase() ?? ''
            return gloss.includes(baseForm.toLocaleLowerCase()) && /(past|participle|plural|comparative|superlative)/.test(gloss)
          })?.gloss
        : ''
    const alternatives = [
      ...new Set(dictionary?.entry?.flatMap((entry) => entry.reverse_translation ?? []) ?? []),
    ]
      .filter((alternative) => alternative.toLocaleLowerCase() !== word.toLocaleLowerCase())
      .slice(0, 5)
    return {
      translation,
      partOfSpeech: dictionary?.pos ?? definitionGroup?.pos ?? '',
      definition: grammaticalDefinition?.trim() || definitionGroup?.entry?.[0]?.gloss?.trim() || '',
      baseForm,
      alternatives,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', cancel)
  }
}

async function analyzeWithApi(request: LearningRequest, signal?: AbortSignal): Promise<LearningResult> {
  const { apiUrl } = currentSettings()
  if (!apiUrl) throw new Error('No server address is set. Open Settings to add one.')

  let response: Response
  try {
    response = await fetch(`${apiUrl}/api/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('No internet connection. Connect to a network or set a local Ollama address in Settings.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    if (response.status === 503) {
      throw new Error(
        request.type === 'word'
          ? 'This word is not in the built-in dictionary. Add a local Ollama address in Settings for full coverage.'
          : 'Sentence translation and grammar need a local Ollama model. Add its address in Settings and try again.',
      )
    }
    throw new Error(body?.message ?? 'Unable to analyze this right now. Please try again.')
  }

  return resultSchema.parse(await response.json())
}

async function analyzeWithOllama(request: LearningRequest, signal?: AbortSignal): Promise<LearningResult> {
  const { ollamaUrl, ollamaModel } = currentSettings()
  const isWord = request.type === 'word'
  let response: Response

  try {
    response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        think: false,
        format: isWord ? wordJsonSchema : sentenceJsonSchema,
        keep_alive: '30m',
        options: {
          temperature: 0,
          repeat_penalty: 1.12,
          num_ctx: isWord ? 1024 : 2048,
          num_predict: isWord ? 280 : 650,
        },
        messages: [
          { role: 'system', content: isWord ? WORD_PROMPT : SENTENCE_PROMPT },
          {
            role: 'user',
            content: `${isWord ? 'Word' : 'Sentence'}: ${JSON.stringify(request.text)}\nContext: ${JSON.stringify(request.context || request.text)}`,
          },
        ],
      }),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(`Could not reach Ollama at ${ollamaUrl}. Check that it is running and both devices share the same Wi-Fi.`)
  }

  const body = (await response.json().catch(() => null)) as
    | { message?: { content?: string }; error?: string }
    | null

  if (!response.ok) {
    const error = (body?.error ?? '').toLowerCase()
    const missingModel = error.includes('model') && error.includes('not found')
    throw new Error(
      missingModel
        ? `The model “${ollamaModel}” is not installed. Run: ollama pull ${ollamaModel}`
        : 'Ollama could not analyze this text.',
    )
  }

  const content = body?.message?.content
  if (!content) throw new Error('Ollama returned an empty response.')
  return { ...resultSchema.parse(JSON.parse(content)), source: 'ollama' }
}

export async function clearAnalysisCache() {
  const keys = await AsyncStorage.getAllKeys()
  const analysisKeys = keys.filter((key) => key.startsWith(CACHE_ROOT))
  if (analysisKeys.length) await AsyncStorage.multiRemove(analysisKeys)
  return analysisKeys.length
}
