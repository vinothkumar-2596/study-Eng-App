import { Asset } from 'expo-asset'
import { Directory, File, Paths } from 'expo-file-system'

// The reader is a self-contained web document: reader.html plus the pdf.js UMD
// build. Metro can only hand us one asset at a time with an opaque cache name, so
// on first launch we copy the three files side by side into the document directory
// under their real names. From there the relative <script src> tags resolve and
// everything works offline — nothing is fetched from a CDN.
const BUNDLE = [
  { module: require('../../assets/reader/reader.html'), name: 'reader.html' },
  { module: require('../../assets/reader/pdf.lib.txt'), name: 'pdf.lib.js' },
  { module: require('../../assets/reader/pdf.worker.txt'), name: 'pdf.worker.js' },
]

// Bump when any bundled reader file changes so installed copies are refreshed.
const BUNDLE_VERSION = 2

let cached: Promise<ReaderBundle> | null = null

export type ReaderBundle = {
  /** file:// URI of reader.html — load this in the WebView. */
  htmlUri: string
  /**
   * file:// URI of the folder holding reader.html, pdf.lib.js, pdf.worker.js and
   * the books. WKWebView grants a page loaded from a file URL read access to
   * that single file only, so this must be handed to the WebView as
   * `allowingReadAccessToURL` — otherwise the sibling <script> tags are blocked
   * and pdf.js never loads.
   */
  directoryUri: string
  /** Directory holding the reader files; opened PDFs are copied here too. */
  directory: Directory
}

export function readerBundle() {
  if (!cached) {
    cached = install().catch((error) => {
      cached = null
      throw error
    })
  }
  return cached
}

async function install(): Promise<ReaderBundle> {
  const directory = new Directory(Paths.document, 'reader')
  if (!directory.exists) directory.create({ intermediates: true })

  const stamp = new File(directory, `.bundle-v${BUNDLE_VERSION}`)
  const html = new File(directory, 'reader.html')

  if (stamp.exists && html.exists) {
    return { htmlUri: html.uri, directoryUri: directory.uri, directory }
  }

  const assets = await Asset.loadAsync(BUNDLE.map((entry) => entry.module))

  for (let index = 0; index < BUNDLE.length; index += 1) {
    const source = assets[index]
    const sourceUri = source?.localUri ?? source?.uri
    if (!sourceUri) throw new Error('The PDF reader files are missing from this build.')

    const destination = new File(directory, BUNDLE[index].name)
    if (destination.exists) destination.delete()
    new File(sourceUri).copy(destination)
  }

  if (!stamp.exists) stamp.create()
  return { htmlUri: html.uri, directoryUri: directory.uri, directory }
}
