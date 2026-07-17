# EcoLima ML — Frontend

SPA Vue 3 para visualización de recomendaciones de puntos de reciclaje en Lima Metropolitana, generadas por un modelo de Machine Learning + GIS.

**Proyecto académico · UPC 2026 · Alexander Cantoral**

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
```

## Variables de entorno

```env
# .env.local
VITE_API_URL=http://localhost:8000
```

---

## Scripts

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción → dist/
npm run preview    # Preview del build
npm run test       # Tests unitarios con Vitest
```

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Análisis + Reportes + Panel ML |
| `analista` | Análisis + Reportes |

---

## Estructura del proyecto

```
src/
├── domains/
│   ├── auth/           → Login, sesión, guards
│   ├── map/            → Mapa Leaflet, puntos, distritos
│   ├── recommendations/→ Zonas recomendadas por ML
│   ├── reports/        → Reportes y exportación
│   ├── ml-panel/       → Panel ML (solo admin)
│   └── datasets/       → Gestión de datasets CSV
├── shared/
│   ├── api/            → Instancia Axios + interceptores
│   ├── components/     → KpiCard, Badge, PriorityBar, Navbar
│   ├── composables/    → useAuth
│   └── utils/          → Formatters
└── router/             → Rutas con guards de autenticación y rol
```

---

## Deploy

El proyecto se despliega automáticamente en **Azure Static Web Apps** al hacer push a `develop`.

La variable `VITE_API_URL` se inyecta en tiempo de build desde el workflow de CI (`.github/workflows/`).
