import { useEffect, useRef, useState } from 'react'
import { analyzeText } from '../lib/learningApi'
import type { LearningResult, ReaderSelection } from '../types/learning'

export function useLearning(selection: ReaderSelection | null) {
  const [result, setResult] = useState<LearningResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  useEffect(() => {
    if (!selection) {
      setResult(null)
      setError('')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const currentId = ++requestId.current
    setLoading(true)
    setError('')
    setResult(null)

    analyzeText({ type: selection.type, text: selection.text, context: selection.context }, controller.signal)
      .then((value) => {
        if (requestId.current === currentId) setResult(value)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        if (requestId.current === currentId) {
          setError(reason instanceof Error ? reason.message : 'Unable to analyze this right now. Please try again.')
        }
      })
      .finally(() => {
        if (requestId.current === currentId) setLoading(false)
      })

    return () => controller.abort()
  }, [selection])

  return { result, loading, error }
}
