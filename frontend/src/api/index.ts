import axios from 'axios'
import type {
  BookSource,
  ImportResult,
  SearchResult,
  BookInfo,
  Chapter,
  ChapterContent,
} from '../types'

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// ─── Book Sources ────────────────────────────────────────────

export async function importSources(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post<ImportResult>('/sources/import', form)
  return data
}

export async function importSourcesJson(sources: BookSource[]): Promise<ImportResult> {
  const { data } = await http.post<ImportResult>('/sources/import', sources)
  return data
}

export async function listSources(params?: {
  group?: string
  enabled?: boolean
  search?: string
}): Promise<BookSource[]> {
  const query: Record<string, string> = {}
  if (params?.group) query.group = params.group
  if (params?.enabled !== undefined) query.enabled = String(params.enabled)
  if (params?.search) query.search = params.search
  const { data } = await http.get<{ sources: BookSource[] }>('/sources', { params: query })
  return data.sources
}

export async function getSource(id: string): Promise<BookSource> {
  const { data } = await http.get<BookSource>(`/sources/${encodeURIComponent(id)}`)
  return data
}

export async function updateSource(
  id: string,
  updates: Partial<BookSource>,
): Promise<BookSource> {
  const { data } = await http.put<BookSource>(
    `/sources/${encodeURIComponent(id)}`,
    updates,
  )
  return data
}

export async function deleteSource(id: string): Promise<void> {
  await http.delete(`/sources/${encodeURIComponent(id)}`)
}

export async function deleteSources(ids: string[]): Promise<void> {
  await http.delete('/sources', { data: { ids } })
}

// ─── Search ──────────────────────────────────────────────────

export async function searchBooks(
  keyword: string,
  sourceId?: string,
  page?: number,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const params: Record<string, string | number> = { keyword }
  if (sourceId) params.sourceId = sourceId
  if (page) params.page = page
  const { data } = await http.get('/search', { params })
  return data
}

// ─── Book ────────────────────────────────────────────────────

export async function getBookInfo(
  sourceId: string,
  bookUrl: string,
): Promise<BookInfo> {
  const { data } = await http.get<BookInfo>('/book/info', {
    params: { sourceId, bookUrl },
  })
  return data
}

export async function getBookToc(
  sourceId: string,
  tocUrl: string,
): Promise<Chapter[]> {
  const { data } = await http.get<{ chapters: Chapter[] }>('/book/toc', {
    params: { sourceId, tocUrl },
  })
  return data.chapters
}

export async function getChapterContent(
  sourceId: string,
  chapterUrl: string,
): Promise<ChapterContent> {
  const { data } = await http.get<ChapterContent>('/book/content', {
    params: { sourceId, chapterUrl },
  })
  return data
}
