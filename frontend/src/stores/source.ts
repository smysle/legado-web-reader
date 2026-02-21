import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BookSource } from '../types'
import * as api from '../api'

export const useSourceStore = defineStore('sources', () => {
  const sources = ref<BookSource[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const enabledSources = computed(() => sources.value.filter((s) => s.enabled !== false))

  const groups = computed(() => {
    const set = new Set<string>()
    sources.value.forEach((s) => {
      if (s.bookSourceGroup) {
        s.bookSourceGroup.split(/[;；,，]/).forEach((g) => {
          const trimmed = g.trim()
          if (trimmed) set.add(trimmed)
        })
      }
    })
    return Array.from(set).sort()
  })

  async function fetchSources(params?: { group?: string; enabled?: boolean; search?: string }) {
    loading.value = true
    error.value = null
    try {
      sources.value = await api.listSources(params)
    } catch (e: any) {
      error.value = e.message || 'Failed to load sources'
    } finally {
      loading.value = false
    }
  }

  async function importFile(file: File) {
    loading.value = true
    error.value = null
    try {
      const result = await api.importSources(file)
      await fetchSources()
      return result
    } catch (e: any) {
      error.value = e.message || 'Import failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function toggleSource(sourceUrl: string, enabled: boolean) {
    try {
      await api.updateSource(sourceUrl, { enabled } as any)
      const s = sources.value.find((x) => x.bookSourceUrl === sourceUrl)
      if (s) s.enabled = enabled
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function removeSource(sourceUrl: string) {
    try {
      await api.deleteSource(sourceUrl)
      sources.value = sources.value.filter((s) => s.bookSourceUrl !== sourceUrl)
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function removeSources(urls: string[]) {
    try {
      await api.deleteSources(urls)
      const set = new Set(urls)
      sources.value = sources.value.filter((s) => !set.has(s.bookSourceUrl))
    } catch (e: any) {
      error.value = e.message
    }
  }

  return {
    sources,
    loading,
    error,
    enabledSources,
    groups,
    fetchSources,
    importFile,
    toggleSource,
    removeSource,
    removeSources,
  }
})
