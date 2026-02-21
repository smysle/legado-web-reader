import type { BookshelfItem, ReaderSettings, ThemeMode } from '../types'

const BOOKSHELF_KEY = 'legado-bookshelf'
const READER_SETTINGS_KEY = 'legado-reader-settings'
const READING_PROGRESS_KEY = 'legado-reading-progress'

// ─── Bookshelf ───────────────────────────────────────────────

export function getBookshelf(): BookshelfItem[] {
  try {
    const raw = localStorage.getItem(BOOKSHELF_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveBookshelf(items: BookshelfItem[]): void {
  localStorage.setItem(BOOKSHELF_KEY, JSON.stringify(items))
}

export function addToBookshelf(item: BookshelfItem): void {
  const shelf = getBookshelf()
  const idx = shelf.findIndex((b) => b.id === item.id)
  if (idx >= 0) {
    shelf[idx] = { ...shelf[idx], ...item }
  } else {
    shelf.unshift(item)
  }
  saveBookshelf(shelf)
}

export function removeFromBookshelf(id: string): void {
  const shelf = getBookshelf().filter((b) => b.id !== id)
  saveBookshelf(shelf)
}

export function isInBookshelf(id: string): boolean {
  return getBookshelf().some((b) => b.id === id)
}

export function makeBookId(sourceId: string, bookUrl: string): string {
  // Simple hash to create a stable ID
  let hash = 0
  const str = sourceId + '|' + bookUrl
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(36)
}

// ─── Reader Settings ─────────────────────────────────────────

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  maxWidth: 800,
  theme: 'light',
}

export function getReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(READER_SETTINGS_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings))
}

// ─── Reading Progress ────────────────────────────────────────

interface ReadingProgress {
  chapterIndex: number
  scrollY: number
}

export function getReadingProgress(bookId: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(READING_PROGRESS_KEY)
    const all: Record<string, ReadingProgress> = raw ? JSON.parse(raw) : {}
    return all[bookId] || null
  } catch {
    return null
  }
}

export function saveReadingProgress(bookId: string, progress: ReadingProgress): void {
  try {
    const raw = localStorage.getItem(READING_PROGRESS_KEY)
    const all: Record<string, ReadingProgress> = raw ? JSON.parse(raw) : {}
    all[bookId] = progress
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}
