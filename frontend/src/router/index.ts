import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'bookshelf',
      component: () => import('../views/BookshelfView.vue'),
    },
    {
      path: '/sources',
      name: 'sources',
      component: () => import('../views/SourcesView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchView.vue'),
    },
    {
      path: '/book',
      name: 'book',
      component: () => import('../views/BookDetailView.vue'),
    },
    {
      path: '/reader',
      name: 'reader',
      component: () => import('../views/ReaderView.vue'),
    },
  ],
})

export default router
