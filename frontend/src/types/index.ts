export interface BookSource {
  bookSourceUrl: string
  bookSourceName: string
  bookSourceGroup?: string
  bookSourceType: number
  enabled?: boolean
  header?: string
  searchUrl?: string
  exploreUrl?: string
  ruleSearch?: Record<string, string>
  ruleBookInfo?: Record<string, string>
  ruleToc?: Record<string, string>
  ruleContent?: Record<string, string>
}

export interface ImportResult {
  imported: number
  duplicates: number
  errors: Array<{ index: number; reason: string }>
}

export interface SearchResult {
  sourceId: string
  sourceName: string
  name: string
  author: string
  intro?: string
  kind?: string
  lastChapter?: string
  coverUrl?: string
  bookUrl: string
  wordCount?: string
}

export interface BookInfo {
  name: string
  author: string
  intro?: string
  kind?: string
  lastChapter?: string
  coverUrl?: string
  tocUrl: string
  wordCount?: string
}

export interface Chapter {
  name: string
  url: string
  isVip?: boolean
}

export interface ChapterContent {
  title: string
  content: string
  contentType?: 'html' | 'text'
  nextContentUrl?: string | null
}

export interface BookshelfItem {
  id: string
  sourceId: string
  bookUrl: string
  name: string
  author: string
  coverUrl?: string
  lastReadChapter?: number
  lastReadTime?: number
  tocUrl?: string
}

export type ThemeMode = 'light' | 'dark' | 'sepia'

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  maxWidth: number
  theme: ThemeMode
}
