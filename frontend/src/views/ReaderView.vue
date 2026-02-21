<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBookToc, getChapterContent } from '../api'
import { useReaderStore, useBookshelfStore } from '../stores/bookshelf'
import { makeBookId } from '../utils/storage'
import type { Chapter, ChapterContent, ThemeMode } from '../types'

const route = useRoute()
const router = useRouter()
const readerStore = useReaderStore()
const shelfStore = useBookshelfStore()

const sourceId = computed(() => String(route.query.sourceId || ''))
const bookUrl = computed(() => String(route.query.bookUrl || ''))
const tocUrl = computed(() => String(route.query.tocUrl || ''))
const chapterIndexQuery = computed(() => Number(route.query.chapterIndex || 0))
const bookId = computed(() => makeBookId(sourceId.value, bookUrl.value))

const chapters = ref<Chapter[]>([])
const currentIndex = ref(0)
const content = ref<ChapterContent | null>(null)
const loading = ref(true)
const error = ref('')
const showSettings = ref(false)
const showToc = ref(false)

const settings = computed(() => readerStore.settings)

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < chapters.value.length - 1)
const currentChapter = computed(() => chapters.value[currentIndex.value])

const themeOptions: { value: ThemeMode; label: string; color: string }[] = [
  { value: 'light', label: '亮色', color: 'bg-white border-gray-300' },
  { value: 'dark', label: '暗色', color: 'bg-gray-800 border-gray-600' },
  { value: 'sepia', label: '护眼', color: 'bg-amber-100 border-amber-300' },
]

// Theme-specific content background
const contentBg = computed(() => {
  switch (settings.value.theme) {
    case 'dark': return 'bg-gray-900 text-gray-200'
    case 'sepia': return 'bg-[#f5e6d3] text-[#5e3f2a]'
    default: return 'bg-white text-gray-900'
  }
})

const containerBg = computed(() => {
  switch (settings.value.theme) {
    case 'dark': return 'bg-gray-950'
    case 'sepia': return 'bg-[#ede0d0]'
    default: return 'bg-gray-100'
  }
})

onMounted(async () => {
  if (!sourceId.value || !tocUrl.value) {
    error.value = '参数缺失'
    loading.value = false
    return
  }

  try {
    chapters.value = await getBookToc(sourceId.value, tocUrl.value)
    
    // Restore progress or use query param
    const saved = readerStore.getProgress(bookId.value)
    currentIndex.value = saved?.chapterIndex ?? chapterIndexQuery.value
    if (currentIndex.value >= chapters.value.length) {
      currentIndex.value = 0
    }

    await loadContent()
  } catch (e: any) {
    error.value = e?.response?.data?.error || e.message || '加载失败'
    loading.value = false
  }
})

async function loadContent() {
  if (!chapters.value[currentIndex.value]) return
  loading.value = true
  error.value = ''
  content.value = null

  try {
    const ch = chapters.value[currentIndex.value]
    let result = await getChapterContent(sourceId.value, ch.url)

    // Handle nextContentUrl (paginated content)
    if (result.nextContentUrl) {
      let fullContent = result.content
      let nextUrl: string | null | undefined = result.nextContentUrl
      let guard = 0
      while (nextUrl && guard < 10) {
        guard++
        const more = await getChapterContent(sourceId.value, nextUrl)
        fullContent += more.content
        nextUrl = more.nextContentUrl
      }
      result = { ...result, content: fullContent, nextContentUrl: null }
    }

    content.value = result

    // Save progress
    readerStore.setProgress(bookId.value, currentIndex.value, 0)
    shelfStore.updateProgress(bookId.value, currentIndex.value)

    // Scroll to top
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  } catch (e: any) {
    error.value = e?.response?.data?.error || e.message || '加载章节失败'
  } finally {
    loading.value = false
  }
}

async function goChapter(index: number) {
  if (index < 0 || index >= chapters.value.length) return
  currentIndex.value = index
  showToc.value = false
  await loadContent()
}

async function prevChapter() {
  if (hasPrev.value) await goChapter(currentIndex.value - 1)
}

async function nextChapter() {
  if (hasNext.value) await goChapter(currentIndex.value + 1)
}

// Keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prevChapter()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextChapter()
  } else if (e.key === 'Escape') {
    showSettings.value = false
    showToc.value = false
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function goBack() {
  router.push({
    path: '/book',
    query: { sourceId: sourceId.value, bookUrl: bookUrl.value },
  })
}

function processContent(html: string): string {
  // Convert \n to <br> if it's plain text
  if (!html.includes('<p>') && !html.includes('<div>') && !html.includes('<br')) {
    return html
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `<p>${line.trim()}</p>`)
      .join('')
  }
  return html
}
</script>

<template>
  <div :class="['min-h-screen', containerBg]">
    <!-- Top bar -->
    <div
      class="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800"
    >
      <div class="max-w-4xl mx-auto flex items-center justify-between px-4 h-12">
        <button
          class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          @click="goBack"
        >
          ← 返回
        </button>
        <span class="text-sm font-medium truncate mx-4 text-gray-700 dark:text-gray-300">
          {{ currentChapter?.name || '加载中...' }}
        </span>
        <div class="flex items-center gap-2">
          <button
            class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            @click="showToc = !showToc"
            title="目录"
          >
            📋
          </button>
          <button
            class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            @click="showSettings = !showSettings"
            title="设置"
          >
            ⚙️
          </button>
        </div>
      </div>
    </div>

    <!-- Settings panel -->
    <div
      v-if="showSettings"
      class="sticky top-12 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div class="max-w-4xl mx-auto p-4 space-y-4">
        <!-- Font size -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">字号</span>
          <div class="flex items-center gap-3">
            <button
              class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="readerStore.updateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })"
            >
              A-
            </button>
            <span class="text-sm w-8 text-center">{{ settings.fontSize }}</span>
            <button
              class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="readerStore.updateSettings({ fontSize: Math.min(32, settings.fontSize + 2) })"
            >
              A+
            </button>
          </div>
        </div>

        <!-- Line height -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">行距</span>
          <div class="flex items-center gap-2">
            <button
              v-for="lh in [1.5, 1.8, 2.0, 2.5]"
              :key="lh"
              class="px-3 py-1 text-xs rounded-full border transition-colors"
              :class="settings.lineHeight === lh
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'"
              @click="readerStore.updateSettings({ lineHeight: lh })"
            >
              {{ lh }}
            </button>
          </div>
        </div>

        <!-- Max width -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">页宽</span>
          <input
            type="range"
            :value="settings.maxWidth"
            min="500"
            max="1200"
            step="50"
            class="w-40 accent-indigo-600"
            @input="readerStore.updateSettings({ maxWidth: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>

        <!-- Theme -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">主题</span>
          <div class="flex items-center gap-2">
            <button
              v-for="t in themeOptions"
              :key="t.value"
              class="w-8 h-8 rounded-full border-2 transition-transform"
              :class="[
                t.color,
                settings.theme === t.value ? 'scale-110 ring-2 ring-indigo-500' : 'hover:scale-105',
              ]"
              :title="t.label"
              @click="readerStore.updateSettings({ theme: t.value })"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- TOC sidebar -->
    <Teleport to="body">
      <div
        v-if="showToc"
        class="fixed inset-0 z-50 flex"
      >
        <div class="absolute inset-0 bg-black/30" @click="showToc = false" />
        <div class="relative w-80 max-w-[80vw] bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 class="font-semibold">目录</h3>
            <button
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              @click="showToc = false"
            >
              ✕
            </button>
          </div>
          <div class="py-1">
            <button
              v-for="(ch, i) in chapters"
              :key="i"
              class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate"
              :class="i === currentIndex
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 font-medium'
                : 'text-gray-700 dark:text-gray-300'"
              @click="goChapter(i)"
            >
              {{ ch.name }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Content area -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <div
        :class="['rounded-xl shadow-sm p-6 sm:p-8 mx-auto', contentBg]"
        :style="{ maxWidth: settings.maxWidth + 'px' }"
      >
        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <div class="animate-spin inline-block w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full mb-3"></div>
          <p class="text-gray-400">加载中...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-16">
          <div class="text-5xl mb-4">😵</div>
          <p class="text-red-500 mb-4">{{ error }}</p>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
            @click="loadContent"
          >
            重试
          </button>
        </div>

        <!-- Chapter content -->
        <template v-else-if="content">
          <h2 class="text-xl font-bold mb-6 text-center">
            {{ content.title || currentChapter?.name }}
          </h2>
          <div
            class="reader-content"
            :style="{
              fontSize: settings.fontSize + 'px',
              lineHeight: settings.lineHeight,
            }"
            v-html="processContent(content.content)"
          />
        </template>
      </div>

      <!-- Navigation buttons -->
      <div
        class="flex items-center justify-between mt-6 mb-10 mx-auto"
        :style="{ maxWidth: settings.maxWidth + 'px' }"
      >
        <button
          class="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="hasPrev
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'"
          :disabled="!hasPrev"
          @click="prevChapter"
        >
          ← 上一章
        </button>
        <span class="text-xs text-gray-400">
          {{ currentIndex + 1 }} / {{ chapters.length }}
        </span>
        <button
          class="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="hasNext
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'"
          :disabled="!hasNext"
          @click="nextChapter"
        >
          下一章 →
        </button>
      </div>
    </div>
  </div>
</template>
