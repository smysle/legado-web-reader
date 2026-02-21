<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchBooks } from '../api'
import type { SearchResult } from '../types'

const router = useRouter()
const keyword = ref('')
const loading = ref(false)
const results = ref<SearchResult[]>([])
const searched = ref(false)
const errorMsg = ref('')

async function doSearch() {
  const q = keyword.value.trim()
  if (!q) return
  loading.value = true
  searched.value = true
  errorMsg.value = ''
  results.value = []
  try {
    const data = await searchBooks(q)
    results.value = data.results
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error || e.message || '搜索失败'
  } finally {
    loading.value = false
  }
}

function openBook(result: SearchResult) {
  router.push({
    path: '/book',
    query: {
      sourceId: result.sourceId,
      bookUrl: result.bookUrl,
    },
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') doSearch()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
    <h1 class="text-2xl font-bold mb-6">🔍 搜索书籍</h1>

    <!-- Search bar -->
    <div class="flex gap-2 mb-6">
      <input
        v-model="keyword"
        type="text"
        placeholder="输入书名或作者..."
        class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        @keydown="handleKeydown"
      />
      <button
        class="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
        :disabled="loading || !keyword.trim()"
        @click="doSearch"
      >
        {{ loading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin inline-block w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full mb-3"></div>
      <p class="text-gray-500 dark:text-gray-400">正在搜索所有启用的书源...</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="errorMsg"
      class="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
    >
      ❌ {{ errorMsg }}
    </div>

    <!-- No results -->
    <div
      v-else-if="searched && results.length === 0"
      class="text-center py-12"
    >
      <div class="text-5xl mb-4">🔎</div>
      <p class="text-gray-500 dark:text-gray-400">未找到相关书籍</p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
        试试其他关键词，或确认书源已导入并启用
      </p>
    </div>

    <!-- Results -->
    <div v-else-if="results.length > 0" class="space-y-3">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
        找到 {{ results.length }} 个结果
      </p>
      <div
        v-for="(result, i) in results"
        :key="i"
        class="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition-colors"
        @click="openBook(result)"
      >
        <!-- Cover -->
        <div class="w-16 h-22 shrink-0">
          <div
            v-if="result.coverUrl"
            class="w-16 h-22 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
          >
            <img
              :src="result.coverUrl"
              :alt="result.name"
              class="w-full h-full object-cover"
              loading="lazy"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
          </div>
          <div
            v-else
            class="w-16 h-22 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center"
          >
            <span class="text-2xl">📖</span>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-base truncate">{{ result.name }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ result.author }}
            <span v-if="result.kind" class="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
              {{ result.kind }}
            </span>
          </p>
          <p
            v-if="result.intro"
            class="text-sm text-gray-400 dark:text-gray-500 mt-1 line-clamp-2"
          >
            {{ result.intro }}
          </p>
          <div class="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span v-if="result.lastChapter">最新: {{ result.lastChapter }}</span>
            <span v-if="result.wordCount">{{ result.wordCount }}</span>
            <span class="text-indigo-500 dark:text-indigo-400">{{ result.sourceName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Initial state -->
    <div v-else class="text-center py-16">
      <div class="text-5xl mb-4">📚</div>
      <p class="text-gray-400 dark:text-gray-500">输入书名开始搜索</p>
    </div>
  </div>
</template>
