<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSourceStore } from '../stores/source'
import type { ImportResult } from '../types'

const store = useSourceStore()
const fileInput = ref<HTMLInputElement | null>(null)
const importResult = ref<ImportResult | null>(null)
const filterGroup = ref('')
const filterSearch = ref('')
const selectedSources = ref<Set<string>>(new Set())

onMounted(() => {
  store.fetchSources()
})

const filteredSources = computed(() => {
  let list = store.sources
  if (filterGroup.value) {
    list = list.filter((s) =>
      s.bookSourceGroup?.includes(filterGroup.value),
    )
  }
  if (filterSearch.value) {
    const q = filterSearch.value.toLowerCase()
    list = list.filter(
      (s) =>
        s.bookSourceName.toLowerCase().includes(q) ||
        s.bookSourceUrl.toLowerCase().includes(q),
    )
  }
  return list
})

async function handleImport() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const result = await store.importFile(file)
    importResult.value = result
    setTimeout(() => (importResult.value = null), 5000)
  } catch {
    // error handled by store
  }
  input.value = ''
}

async function toggleEnabled(sourceUrl: string, enabled: boolean) {
  await store.toggleSource(sourceUrl, enabled)
}

async function removeSelected() {
  if (selectedSources.value.size === 0) return
  if (!confirm(`确认删除 ${selectedSources.value.size} 个书源？`)) return
  await store.removeSources(Array.from(selectedSources.value))
  selectedSources.value.clear()
}

function toggleSelect(url: string) {
  if (selectedSources.value.has(url)) {
    selectedSources.value.delete(url)
  } else {
    selectedSources.value.add(url)
  }
}

function selectAll() {
  if (selectedSources.value.size === filteredSources.value.length) {
    selectedSources.value.clear()
  } else {
    filteredSources.value.forEach((s) => selectedSources.value.add(s.bookSourceUrl))
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">⚙️ 书源管理</h1>
      <div class="flex gap-2">
        <button
          v-if="selectedSources.size > 0"
          class="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
          @click="removeSelected"
        >
          🗑️ 删除 ({{ selectedSources.size }})
        </button>
        <button
          class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          @click="handleImport"
        >
          📥 导入书源
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="onFileChange"
        />
      </div>
    </div>

    <!-- Import result toast -->
    <div
      v-if="importResult"
      class="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm"
    >
      ✅ 导入成功：{{ importResult.imported }} 个书源
      <span v-if="importResult.duplicates"> | {{ importResult.duplicates }} 个重复</span>
      <span v-if="importResult.errors.length"> | {{ importResult.errors.length }} 个错误</span>
    </div>

    <!-- Error -->
    <div
      v-if="store.error"
      class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm"
    >
      ❌ {{ store.error }}
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        v-model="filterSearch"
        type="text"
        placeholder="搜索书源..."
        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select
        v-model="filterGroup"
        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">全部分组</option>
        <option v-for="g in store.groups" :key="g" :value="g">{{ g }}</option>
      </select>
    </div>

    <!-- Stats bar -->
    <div class="flex items-center justify-between mb-3 text-sm text-gray-500 dark:text-gray-400">
      <span>
        共 {{ filteredSources.length }} 个书源
        <span v-if="filteredSources.length !== store.sources.length">
          / {{ store.sources.length }}
        </span>
      </span>
      <button
        class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        @click="selectAll"
      >
        {{ selectedSources.size === filteredSources.length && filteredSources.length > 0 ? '取消全选' : '全选' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.sources.length === 0" class="text-center py-12 text-gray-400">
      <div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full mb-3"></div>
      <p>加载中...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="store.sources.length === 0" class="text-center py-16">
      <div class="text-5xl mb-4">📦</div>
      <p class="text-gray-500 dark:text-gray-400 mb-4">尚未导入任何书源</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mb-6">
        请上传 Legado 书源 JSON 文件
      </p>
      <button
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        @click="handleImport"
      >
        📥 导入书源
      </button>
    </div>

    <!-- Source list -->
    <div v-else class="space-y-2">
      <div
        v-for="source in filteredSources"
        :key="source.bookSourceUrl"
        class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <!-- Checkbox -->
        <input
          type="checkbox"
          :checked="selectedSources.has(source.bookSourceUrl)"
          class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          @change="toggleSelect(source.bookSourceUrl)"
        />

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm truncate">{{ source.bookSourceName }}</span>
            <span
              v-if="source.bookSourceGroup"
              class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded"
            >
              {{ source.bookSourceGroup }}
            </span>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {{ source.bookSourceUrl }}
          </p>
        </div>

        <!-- Toggle -->
        <button
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
          :class="source.enabled !== false ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'"
          @click="toggleEnabled(source.bookSourceUrl, source.enabled === false)"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="source.enabled !== false ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
