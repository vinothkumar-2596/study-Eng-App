import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'study-eng:settings'

export type Settings = {
  /** Hosted API. Serves the built-in dictionary; no setup required. */
  apiUrl: string
  /**
   * Optional Ollama instance on the same network — usually the machine running
   * `ollama serve`. Native fetch is not a browser request, so unlike the web app
   * there is no CORS handshake and no local-network permission prompt.
   */
  ollamaUrl: string
  ollamaModel: string
}

export const DEFAULT_SETTINGS: Settings = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://study-eng-two.vercel.app',
  ollamaUrl: process.env.EXPO_PUBLIC_OLLAMA_URL || '',
  ollamaModel: process.env.EXPO_PUBLIC_OLLAMA_MODEL || 'qwen3:4b',
}

let current: Settings = DEFAULT_SETTINGS
const listeners = new Set<(settings: Settings) => void>()

export function currentSettings() {
  return current
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) current = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    current = DEFAULT_SETTINGS
  }
  emit()
  return current
}

export async function saveSettings(next: Partial<Settings>) {
  current = {
    ...current,
    ...next,
    apiUrl: trimUrl(next.apiUrl ?? current.apiUrl),
    ollamaUrl: trimUrl(next.ollamaUrl ?? current.ollamaUrl),
    ollamaModel: (next.ollamaModel ?? current.ollamaModel).trim() || DEFAULT_SETTINGS.ollamaModel,
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(current))
  emit()
  return current
}

export function subscribeToSettings(listener: (settings: Settings) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit() {
  listeners.forEach((listener) => listener(current))
}

function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

export type ConnectionCheck = {
  ok: boolean
  detail: string
}

/** Used by the Settings screen so a wrong IP is caught before reading starts. */
export async function testOllama(url: string, model: string): Promise<ConnectionCheck> {
  const base = trimUrl(url)
  if (!base) return { ok: false, detail: 'No address entered.' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(`${base}/api/tags`, { signal: controller.signal })
    if (!response.ok) return { ok: false, detail: `Server answered with ${response.status}.` }

    const body = (await response.json()) as { models?: { name?: string }[] }
    const names = (body.models ?? []).map((entry) => entry.name ?? '')
    if (!names.length) return { ok: false, detail: 'Connected, but no models are installed.' }

    const wanted = model.trim()
    const installed = names.some((name) => name === wanted || name.split(':')[0] === wanted.split(':')[0])
    return installed
      ? { ok: true, detail: `Connected. ${wanted} is ready.` }
      : { ok: false, detail: `Connected, but ${wanted} is not installed. Run: ollama pull ${wanted}` }
  } catch (error) {
    return {
      ok: false,
      detail:
        controller.signal.aborted
          ? 'No answer within 6 seconds. Check the IP address and that both devices are on the same Wi-Fi.'
          : 'Could not reach that address. Make sure Ollama runs with OLLAMA_HOST=0.0.0.0 and the firewall allows port 11434.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function testApi(url: string): Promise<ConnectionCheck> {
  const base = trimUrl(url)
  if (!base) return { ok: false, detail: 'No address entered.' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(`${base}/api/health`, { signal: controller.signal })
    if (!response.ok) return { ok: false, detail: `Server answered with ${response.status}.` }
    const body = (await response.json()) as { mode?: string }
    return {
      ok: true,
      detail:
        body.mode === 'ollama'
          ? 'Connected. The server has a model available.'
          : 'Connected. Built-in dictionary only — add a local Ollama below for full coverage.',
    }
  } catch {
    return { ok: false, detail: 'Could not reach that address.' }
  } finally {
    clearTimeout(timer)
  }
}
