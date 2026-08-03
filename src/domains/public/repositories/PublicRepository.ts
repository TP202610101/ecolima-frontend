import axios from 'axios'

// Instancia sin interceptores de auth — nunca adjunta token ni redirige en 401.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
})

export interface PublicPoint {
  id: number
  nombre: string
  lat: number
  lng: number
  materiales: string[]
  distancia: number
}

export const PublicRepository = {
  async getNearby(lat: number, lng: number, radius_m = 2000): Promise<PublicPoint[]> {
    try {
      const res = await publicApi.get('/api/v1/public/recycling-points', {
        params: { lat, lng, radius_m },
      })
      return (res.data.points as PublicPoint[]) ?? []
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 422) throw new Error('OUT_OF_RANGE')
        if (!e.response) throw new Error('Sin conexión. Verifica tu red.')
      }
      throw new Error('No se pudo cargar los puntos.')
    }
  },
}
