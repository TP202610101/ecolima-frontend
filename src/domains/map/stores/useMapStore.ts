import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', {
  state: () => ({
    points: [] as any[],
    selectedZone: null as any | null
  }),
  actions: {
    setPoints(points: any[]) { this.points = points }
  }
})
