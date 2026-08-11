import * as DocumentPicker from 'expo-document-picker'
import { randomUUID } from 'expo-crypto'
import { Directory, File } from 'expo-file-system'
import { readerBundle } from './readerAssets'
import type { RecentBook } from '../types/learning'

const MAX_FILE_SIZE = 50 * 1024 * 1024

export class PdfSourceError extends Error {}

/**
 * Books are stored in a `books` folder next to reader.html so the WebView can
 * open them with a plain relative path — no multi-megabyte base64 string has to
 * cross the bridge. The file never leaves the device.
 */
async function booksDirectory() {
  const { directory } = await readerBundle()
  const books = new Directory(directory, 'books')
  if (!books.exists) books.create({ intermediates: true })
  return books
}

export async function pickPdf(): Promise<RecentBook | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  })

  if (picked.canceled) return null

  const asset = picked.assets?.[0]
  if (!asset) return null

  const name = asset.name || 'document.pdf'
  if (asset.mimeType !== 'application/pdf' && !name.toLowerCase().endsWith('.pdf')) {
    throw new PdfSourceError('Please choose a PDF file.')
  }
  if (typeof asset.size === 'number' && asset.size > MAX_FILE_SIZE) {
    throw new PdfSourceError('This PDF is larger than 50 MB. Please choose a smaller file.')
  }

  const id = randomUUID()
  const fileName = `${id}.pdf`
  const books = await booksDirectory()
  const destination = new File(books, fileName)

  try {
    new File(asset.uri).copy(destination)
  } catch {
    throw new PdfSourceError('This PDF could not be opened from that location.')
  }

  return {
    id,
    name: name.replace(/\.pdf$/i, ''),
    fileName,
    sizeBytes: asset.size ?? destination.size ?? 0,
    openedAt: new Date().toISOString(),
    page: 1,
  }
}

/** Relative URL used inside reader.html — resolved against the reader folder. */
export function readerRelativePath(book: RecentBook) {
  return `books/${book.fileName}`
}

export async function bookExists(book: RecentBook) {
  const books = await booksDirectory()
  return new File(books, book.fileName).exists
}

export async function deleteBookFile(book: RecentBook) {
  const books = await booksDirectory()
  const file = new File(books, book.fileName)
  if (file.exists) file.delete()
}

/**
 * Fallback used only when the WebView cannot read the file directly. Returns the
 * PDF as base64 chunks small enough to inject one evaluation at a time.
 */
export async function readBookAsChunks(book: RecentBook, chunkSize = 262_144) {
  const books = await booksDirectory()
  const base64 = await new File(books, book.fileName).base64()
  const chunks: string[] = []
  for (let index = 0; index < base64.length; index += chunkSize) {
    chunks.push(base64.slice(index, index + chunkSize))
  }
  return chunks
}

export function formatSize(bytes: number) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
