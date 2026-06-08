import { defineStore } from 'pinia'

export const useRecommendationsStore = defineStore('recommendations', {
  state: () => ({
    items: [] as any[]
  }),
  actions: {
    setItems(items: any[]) { this.items = items }
  }
})
