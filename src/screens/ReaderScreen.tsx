import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { LearningSheet } from '../components/LearningSheet'
import { ReaderToolbar } from '../components/ReaderToolbar'
import { EmptyState, Notice, SecondaryButton } from '../components/ui'
import { useLearning } from '../hooks/useLearning'
import { readBookAsChunks, readerRelativePath } from '../lib/pdfSource'
import { readerBundle } from '../lib/readerAssets'
import { getSavedWords, saveSentence, saveWord, updateBookPage } from '../lib/storage'
import type { RootStackParamList } from '../navigation'
import { color, space, type } from '../theme/tokens'
import type { ReaderSelection, SentenceLearning, WordLearning } from '../types/learning'

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>

type ReaderMessage =
  | { type: 'ready' }
  | { type: 'pageInfo'; page: number; pages: number; hasText: boolean }
  | { type: 'select'; selection: ReaderSelection }
  | { type: 'tooLong' }
  | { type: 'loadFailed'; message: string }
  | { type: 'error'; message: string }

export function ReaderScreen({ navigation, route }: Props) {
  const { book } = route.params
  const webRef = useRef<WebView>(null)

  const [htmlUri, setHtmlUri] = useState('')
  const [readerDirectoryUri, setReaderDirectoryUri] = useState('')
  const [bootError, setBootError] = useState('')
  const [documentError, setDocumentError] = useState('')
  const [rendering, setRendering] = useState(true)

  const [page, setPage] = useState(book.page || 1)
  const [pages, setPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width')
  const [hasText, setHasText] = useState(true)
  const [tooLong, setTooLong] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const [selection, setSelection] = useState<ReaderSelection | null>(null)
  const { result, loading, error, retry } = useLearning(selection)

  const openedRef = useRef(false)
  const initialPageRef = useRef(book.page || 1)

  useEffect(() => {
    let active = true
    readerBundle()
      .then((bundle) => {
        if (!active) return
        setHtmlUri(bundle.htmlUri)
        setReaderDirectoryUri(bundle.directoryUri)
      })
      .catch((reason: unknown) => {
        if (active) setBootError(reason instanceof Error ? reason.message : 'The reader could not start.')
      })
    getSavedWords().then((words) => {
      if (active) setSavedCount(words.length)
    })
    return () => {
      active = false
    }
  }, [])

  const run = useCallback((script: string) => {
    webRef.current?.injectJavaScript(`${script}; true;`)
  }, [])

  /**
   * The WebView normally reads the PDF straight off disk with a relative path.
   * If the platform refuses that file read we stream the bytes across the bridge
   * in chunks instead — slower, but it always works.
   */
  const sendAsChunks = useCallback(async () => {
    try {
      const chunks = await readBookAsChunks(book)
      run('window.__reader.resetChunks()')
      for (const chunk of chunks) {
        run(`window.__reader.pushChunk(${JSON.stringify(chunk)})`)
      }
      run('window.__reader.openChunks()')
    } catch {
      setDocumentError('This PDF could not be read from storage.')
      setRendering(false)
    }
  }, [book, run])

  function handleMessage(event: WebViewMessageEvent) {
    let message: ReaderMessage
    try {
      message = JSON.parse(event.nativeEvent.data) as ReaderMessage
    } catch {
      return
    }

    switch (message.type) {
      case 'ready':
        if (openedRef.current) return
        openedRef.current = true
        run(`window.__reader.open(${JSON.stringify(readerRelativePath(book))})`)
        return

      case 'pageInfo':
        setRendering(false)
        setDocumentError('')
        setPage(message.page)
        setPages(message.pages)
        setHasText(message.hasText)
        void updateBookPage(book.id, message.page)
        // Restore the page the reader was left on, once the document is ready.
        if (initialPageRef.current > 1 && message.page === 1 && message.pages >= initialPageRef.current) {
          const target = initialPageRef.current
          initialPageRef.current = 1
          run(`window.__reader.goToPage(${target})`)
        }
        return

      case 'select':
        void Haptics.selectionAsync()
        setSelection(message.selection)
        return

      case 'tooLong':
        setTooLong(true)
        setTimeout(() => setTooLong(false), 3500)
        return

      case 'loadFailed':
        void sendAsChunks()
        return

      case 'error':
        setRendering(false)
        setDocumentError(message.message)
        return
    }
  }

  function closeSelection() {
    setSelection(null)
    run('window.__reader.clearSelection()')
  }

  function changePage(next: number) {
    closeSelection()
    setRendering(true)
    setPage(next)
    run(`window.__reader.goToPage(${next})`)
  }

  function changeZoom(next: number) {
    setZoom(next)
    run(`window.__reader.setZoom(${next})`)
  }

  function changeFit(mode: 'width' | 'page') {
    setFitMode(mode)
    setZoom(1)
    run(`window.__reader.setFit(${JSON.stringify(mode)})`)
  }

  async function handleSaveWord(word: WordLearning) {
    if (!selection) return
    const words = await saveWord(word, selection.context)
    setSavedCount(words.length)
  }

  async function handleSaveSentence(sentence: SentenceLearning) {
    if (!selection) return
    await saveSentence(selection.text, sentence)
  }

  if (bootError) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <EmptyState icon="alert-triangle" title="The reader could not start" body={bootError} />
        <View style={styles.errorActions}>
          <SecondaryButton label="Go back" icon="chevron-left" onPress={navigation.goBack} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ReaderToolbar
        title={book.name}
        page={page}
        pages={pages}
        zoom={zoom}
        fitMode={fitMode}
        savedCount={savedCount}
        onBack={navigation.goBack}
        onOpenLibrary={() => navigation.navigate('Library')}
        onPageChange={changePage}
        onZoomChange={changeZoom}
        onFitModeChange={changeFit}
      />

      <View style={styles.hint}>
        <Text style={styles.hintText}>Tap a word · press and hold to select a sentence</Text>
      </View>

      <View style={styles.stage}>
        {htmlUri && readerDirectoryUri ? (
          <WebView
            ref={webRef}
            source={{ uri: htmlUri }}
            allowingReadAccessToURL={readerDirectoryUri}
            originWhitelist={['*']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
            style={styles.webview}
            containerStyle={styles.webviewContainer}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            scrollEnabled
            bounces={false}
            overScrollMode="never"
            hideKeyboardAccessoryView
            onError={() => setDocumentError('The reader failed to load.')}
          />
        ) : null}

        {documentError ? (
          <View style={styles.overlay}>
            <EmptyState
              icon="file-text"
              title="This PDF could not be opened"
              body={documentError}
            />
            <View style={styles.errorActions}>
              <SecondaryButton label="Choose another PDF" icon="upload" onPress={navigation.goBack} />
            </View>
          </View>
        ) : null}

        {rendering && !documentError ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color={color.green} />
          </View>
        ) : null}
      </View>

      {!hasText && !documentError ? (
        <View style={styles.footerNotice}>
          <Notice tone="alert">
            No selectable text on this page. Scanned books need OCR, which this version does not do yet.
          </Notice>
        </View>
      ) : null}

      {tooLong ? (
        <View style={styles.footerNotice}>
          <Notice tone="alert">Please select a shorter sentence (under 700 characters).</Notice>
        </View>
      ) : null}

      <LearningSheet
        selection={selection}
        result={result}
        loading={loading}
        error={error}
        onRetry={retry}
        onOpenSettings={() => {
          closeSelection()
          navigation.navigate('Settings')
        }}
        onClose={closeSelection}
        onSaveWord={handleSaveWord}
        onSaveSentence={handleSaveSentence}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  hint: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: color.canvas,
  },
  hintText: { ...type.caption, fontSize: 11.5, textAlign: 'center', color: color.faint },
  stage: { flex: 1, backgroundColor: color.canvas, paddingTop: 2 },
  webview: { flex: 1, backgroundColor: color.paper },
  webviewContainer: { backgroundColor: color.canvas },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.paper,
    justifyContent: 'center',
  },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  errorActions: { alignItems: 'center', paddingHorizontal: space.xl },
  footerNotice: { padding: space.lg, backgroundColor: color.paper },
})
