<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookshelfStore } from '../stores/bookshelf'

const router = useRouter()
const shelf = useBookshelfStore()

const sortedBooks = computed(() =>
  [...shelf.books].sort((a, b) => (b.lastReadTime || 0) - (a.lastReadTime || 0)),
)

function openBook(book: typeof shelf.books[0]) {
  router.push({
    path: '/book',
    query: { sourceId: book.sourceId, bookUrl: book.bookUrl },
  })
}

function continueReading(book: typeof shelf.books[0]) {
  if (book.lastReadChapter !== undefined && book.tocUrl) {
    router.push({
      path: '/reader',
      query: {
        sourceId: book.sourceId,
        bookUrl: book.bookUrl,
        tocUrl: book.tocUrl,
        chapterIndex: String(book.lastReadChapter),
      },
    })
  } else {
    openBook(book)
  }
}

function removeBook(id: string, e: Event) {
  e.stopPropagation()
  if (confirm('确认从书架移除？')) {
    shelf.remove(id)
  }
}

function formatTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">📚 我的书架</h1>
      <router-link
        to="/search"
        class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        🔍 搜索添加
      </router-link>
    </div>

    <!-- Empty state -->
    <div v-if="sortedBooks.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4">📖</div>
      <h2 class="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">
        书架空空如也
      </h2>
      <p class="text-gray-400 dark:text-gray-500 mb-6">
        先导入书源，然后搜索添加书籍吧
      </p>
      <div class="flex justify-center gap-3">
        <router-link
          to="/sources"
          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          ⚙️ 导入书源
        </router-link>
        <router-link
          to="/search"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          🔍 搜索书籍
        </router-link>
      </div>
    </div>

    <!-- Book grid -->
    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      <div
        v-for="book in sortedBooks"
        :key="book.id"
        class="group cursor-pointer"
        @click="continueReading(book)"
      >
        <div class="relative aspect-[3/4] bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <img
            v-if="book.coverUrl"
            :src="book.coverUrl"
            :alt="book.name"
            class="w-full h-full object-cover"
            loading="lazy"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <div v-if="!book.coverUrl" class="flex items-center justify-center w-full h-full p-2">
            <span class="text-center text-sm font-medium text-indigo-800 dark:text-indigo-200 line-clamp-3">
              {{ book.name }}
            </span>
          </div>
          <!-- Remove button -->
          <button
            class="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            @click="removeBook(book.id, $event)"
            title="移除"
          >
            ✕
          </button>
        </div>
        <div class="mt-2 px-0.5">
          <p class="text-sm font-medium truncate">{{ book.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ book.author }}
          </p>
          <p v-if="book.lastReadTime" class="text-xs text-gray-400 dark:text-gray-500">
            {{ formatTime(book.lastReadTime) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
