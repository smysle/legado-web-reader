<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileMenuOpen = ref(false)

const navItems = [
  { name: '书架', path: '/', icon: '📚' },
  { name: '搜索', path: '/search', icon: '🔍' },
  { name: '书源', path: '/sources', icon: '⚙️' },
]
</script>

<template>
  <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex justify-between h-14">
        <div class="flex items-center space-x-1">
          <router-link to="/" class="flex items-center space-x-2 text-lg font-bold text-indigo-600 dark:text-indigo-400 mr-6">
            <span>📖</span>
            <span class="hidden sm:inline">阅读</span>
          </router-link>
          <div class="hidden sm:flex space-x-1">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="route.path === item.path
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
            >
              {{ item.icon }} {{ item.name }}
            </router-link>
          </div>
        </div>

        <!-- Mobile menu button -->
        <button
          class="sm:hidden flex items-center px-2 text-gray-600 dark:text-gray-300"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="sm:hidden border-t border-gray-200 dark:border-gray-700">
      <div class="px-2 py-2 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="block px-3 py-2 rounded-md text-base font-medium transition-colors"
          :class="route.path === item.path
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="mobileMenuOpen = false"
        >
          {{ item.icon }} {{ item.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>
