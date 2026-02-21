import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BookshelfItem, ReaderSettings, ThemeMode } from '../types'
import {
  getBookshelf,
  addToBookshelf,
  removeFromBookshelf,
  isInBookshelf,
  getReaderSettings,
  saveReaderSettings,
  getReadingProgress,
  saveReadingProgress,
} from '../utils/storage'

export const useBookshelfStore = defineStore('bookshelf', () => {
  const books = ref<BookshelfItem[]>(getBookshelf())

  function refresh() {
    books.value = getBookshelf()
  }

  function add(item: BookshelfItem) {
    addToBookshelf(item)
    refresh()
  }

  function remove(id: string) {
    removeFromBookshelf(id)
    refresh()
  }

  function has(id: string): boolean {
    return isInBookshelf(id)
  }

  function updateProgress(id: string, chapterIndex: number) {
    const book = books.value.find((b) => b.id === id)
    if (book) {
      book.lastReadChapter = chapterIndex
      book.lastReadTime = Date.now()
      addToBookshelf(book)
      refresh()
    }
  }

  return { books, refresh, add, remove, has, updateProgress }
})

export const useReaderStore = defineStore('reader', () => {
  const settings = ref<ReaderSettings>(getReaderSettings())

  function updateSettings(partial: Partial<ReaderSettings>) {
    Object.assign(settings.value, partial)
    saveReaderSettings(settings.value)
    applyTheme(settings.value.theme)
  }

  function applyTheme(theme: ThemeMode) {
    const html = document.documentElement
    html.classList.remove('dark', 'sepia')
    if (theme === 'dark') {
      html.classList.add('dark')
    } else if (theme === 'sepia') {
      html.classList.add('sepia')
    }
  }

  function getProgress(bookId: string) {
    return getReadingProgress(bookId)
  }

  function setProgress(bookId: string, chapterIndex: number, scrollY: number) {
    saveReadingProgress(bookId, { chapterIndex, scrollY })
  }

  // Apply theme on load
  applyTheme(settings.value.theme)

  return { settings, updateSettings, applyTheme, getProgress, setProgress }
})
