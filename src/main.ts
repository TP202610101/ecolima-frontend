import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'leaflet/dist/leaflet.css'
import '@/styles/index.css'

maplibregl.setWorkerUrl(workerUrl)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const authStore = useAuthStore()
authStore.initFromStorage()

app.mount('#app')
