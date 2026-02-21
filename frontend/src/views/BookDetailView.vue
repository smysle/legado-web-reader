<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBookInfo, getBookToc } from '../api'
import { useBookshelfStore } from '../stores/bookshelf'
import { makeBookId } from '../utils/storage'
import type { BookInfo, Chapter } from '../types'

const route = useRoute()
const router = useRouter()
const shelf = useBookshelfStore()

const sourceId = computed(() => String(route.query.sourceId || ''))
const bookUrl = computed(() => String(route.query.bookUrl || ''))
const bookId = computed(() => makeBookId(sourceId.value, bookUrl.value))

const info = ref<BookInfo | null>(null)
const chapters = ref<Chapter[]>([])
const loading = ref(true)
const loadingToc = ref(false)
const error = ref('')
const showAllChapters = ref(false)
const reverseOrder = ref(false)

const inShelf = computed(() => shelf.has(bookId.value))

const displayedChapters = computed(() => {
  let list = [...chapters.value]
  if (reverseOrder.value) list.reverse()
  if (!showAllChapters.value && list.length > 100) {
    return list.slice(0, 100)
  }
  return list
})

onMounted(async () => {
  if (!sourceId.value || !bookUrl.value) {
    error.value = 'Missing sourceId or bookUrl'
    loading.value = false
    return
  }

  try {
    info.value = await getBookInfo(sourceId.value, bookUrl.value)
    loading.value = false

    // Load TOC
    loadingToc.value = true
    const tocUrl = info.value.tocUrl || bookUrl.value
    chapters.value = await getBookToc(sourceId.value, tocUrl)
  } catch (e: any) {
    error.value = e?.response?.data?.error || e.message || 'Failed to load book info'
  } finally {
    loading.value = false
    loadingToc.value = false
  }
})

function toggleBookshelf() {
  if (inShelf.value) {
    shelf.remove(bookId.value)
  } else if (info.value) {
    shelf.add({
      id: bookId.value,
      sourceId: sourceId.value,
      bookUrl: bookUrl.value,
      name: info.value.name,
      author: info.value.author,
      coverUrl: info.value.coverUrl,
      tocUrl: info.value.tocUrl || bookUrl.value,
      lastReadTime: Date.now(),
    })
  }
}

function readChapter(index: number) {
  // We need to compute the actual index in the original array
  const actualIndex = reverseOrder.value
    ? chapters.value.length - 1 - index
    : index

  // Save tocUrl info to shelf if not already there
  if (info.value && !inShelf.value) {
    shelf.add({
      id: bookId.value,
      sourceId: sourceId.value,
      bookUrl: bookUrl.value,
      name: info.value.name,
      author: info.value.author,
      coverUrl: info.value.coverUrl,
      tocUrl: info.value.tocUrl || bookUrl.value,
      lastReadTime: Date.now(),
      lastReadChapter: actualIndex,
    })
  }

  router.push({
    path: '/reader',
    query: {
      sourceId: sourceId.value,
      bookUrl: bookUrl.value,
      tocUrl: info.value?.tocUrl || bookUrl.value,
      chapterIndex: String(actualIndex),
    },
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-16">
      <div class="animate-spin inline-block w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full mb-3"></div>
      <p class="text-gray-500">加载中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <div class="text-5xl mb-4">😵</div>
      <p class="text-red-500 mb-4">{{ error }}</p>
      <button
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
        @click="router.back()"
      >
        返回
      </button>
    </div>

    <template v-else-if="info">
      <!-- Book info header -->
      <div class="flex gap-5 mb-8">
        <div class="w-28 sm:w-36 shrink-0">
          <div class="aspect-[3/4] rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800">
            <img
              v-if="info.coverUrl"
              :src="info.coverUrl"
              :alt="info.name"
              class="w-full h-full object-cover"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <div v-else class="w-full h-full flex items-center justify-center p-3">
              <span class="text-center text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {{ info.name }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold mb-2">{{ info.name }}</h1>
          <p class="text-gray-500 dark:text-gray-400 mb-1">{{ info.author }}</p>
          <div class="flex flex-wrap gap-2 mb-3">
            <span v-if="info.kind" class="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
              {{ info.kind }}
            </span>
            <span v-if="info.wordCount" class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
              {{ info.wordCount }}
            </span>
            <span v-if="info.lastChapter" class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
              {{ info.lastChapter }}
            </span>
          </div>
          <div class="flex gap-2 mt-3">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="inShelf
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'"
              @click="toggleBookshelf"
            >
              {{ inShelf ? '✕ 移出书架' : '⭐ 加入书架' }}
            </button>
            <button
              v-if="chapters.length > 0"
              class="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              @click="readChapter(0)"
            >
              📖 开始阅读
            </button>
          </div>
        </div>
      </div>

      <!-- Intro -->
      <div v-if="info.intro" class="mb-6">
        <h2 class="text-lg font-semibold mb-2">简介</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
          {{ info.intro }}
        </p>
      </div>

      <!-- Chapter list -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">
            目录
            <span v-if="chapters.length" class="text-sm font-normal text-gray-400">
              ({{ chapters.length }} 章)
            </span>
          </h2>
          <button
            v-if="chapters.length > 0"
            class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            @click="reverseOrder = !reverseOrder"
          >
            {{ reverseOrder ? '正序 ↑' : '倒序 ↓' }}
          </button>
        </div>

        <div v-if="loadingToc" class="text-center py-8">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full mb-2"></div>
          <p class="text-sm text-gray-400">加载目录中...</p>
        </div>

        <div v-else-if="chapters.length === 0" class="text-center py-8 text-gray-400">
          未获取到章节目录
        </div>

        <div v-else class="space-y-0.5">
          <div
            v-for="(ch, i) in displayedChapters"
            :key="i"
            class="flex items-center px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
            @click="readChapter(i)"
          >
            <span class="text-xs text-gray-400 w-10 shrink-0">
              {{ reverseOrder ? chapters.length - i : i + 1 }}
            </span>
            <span class="text-sm flex-1 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {{ ch.name }}
            </span>
            <span
              v-if="ch.isVip"
              class="text-xs text-yellow-500 ml-2"
            >
              VIP
            </span>
          </div>

          <button
            v-if="!showAllChapters && chapters.length > 100"
            class="w-full py-3 text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            @click="showAllChapters = true"
          >
            展开全部 {{ chapters.length }} 章
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
