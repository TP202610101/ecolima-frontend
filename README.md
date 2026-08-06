# EcoLima ML — Frontend

SPA Vue 3 para visualización de recomendaciones de puntos de reciclaje en Lima Metropolitana, generadas por un modelo de Machine Learning + GIS.

**Proyecto académico · UPC 2026 · Alexander Cantoral y Nikole García**

🔗 **Demo:** https://mango-cliff-03aa6110f.7.azurestaticapps.net

---

## Stack

| | |
|---|---|
| Framework | Vue 3 + TypeScript + Vite |
| Estilos | Tailwind CSS v3 |
| Mapa | Leaflet + @vue-leaflet/vue-leaflet |
| HTTP | Axios con interceptores JWT |
| Estado | Pinia |
| Router | Vue Router 4 |
| Iconos | Lucide Vue Next |
| Charts | Chart.js |
| Deploy | Azure Static Web Apps |

---

## Requisitos

- Node.js 18+
- npm 9+
- Backend EcoLima corriendo (ver [ecolima-backend](https://github.com/TP202610101/ecolima-backend))

---

## Instalación y desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con la URL del backend

# Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173
