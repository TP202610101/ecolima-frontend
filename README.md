# EcoLima Frontend

SPA de análisis geoespacial de residuos sólidos para Lima Metropolitana. Consume la API REST del backend FastAPI; no tiene lógica de negocio propia más allá de presentación y validación de formularios.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Vue 3 (Composition API) + TypeScript |
| Build | Vite 5 |
| Estado | Pinia |
| Routing | Vue Router 4 |
| HTTP | Axios (interceptors centralizados) |
| Mapas | Leaflet 1.9 |
| Gráficos | Chart.js 4 |
| Estilos | Tailwind CSS 3 |
| Tests | Vitest + @vue/test-utils |

**Arquitectura**: DDD por dominio. Cada dominio vive en `src/domains/<dominio>/` y contiene sus propias capas (`entities`, `repositories`, `stores`, `views`, `components`, `use-cases`).

---

## Requisitos

- Node.js **18+** (desarrollado con v22.16.0)
- npm 10+
- Backend corriendo en local (ver [ecolima-backend](../ecolima-backend))

---

## Setup local

```bash
git clone <repo-url>
cd ecolima-frontend
npm install
cp .env.example .env.local   # editar con la URL del backend
npm run dev
```

El servidor de desarrollo queda en `http://localhost:5173`.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base del backend (sin trailing slash) |

**Importante**: `VITE_*` se inyecta en tiempo de _build_, no de ejecución. Un build de producción queda fijo con el valor que tenía `VITE_API_URL` al momento de `npm run build`. Para cambiar la URL en producción hay que hacer un nuevo build.

`.env.local` (desarrollo) y `.env.production` están en `.gitignore` y nunca se commitean.

`.env.example`:
```
VITE_API_URL=http://localhost:8000
```

---

## Estructura del código

```
src/
├── domains/
│   ├── admin/          # Gestión de usuarios (solo admin)
│   ├── auth/           # Login, sesión, AuthStore
│   ├── datasets/       # Carga, validación y commit de datasets CSV
│   ├── map/            # Vista de análisis geoespacial con Leaflet
│   ├── ml-panel/       # Panel ML: inferencia, modelos, cobertura
│   ├── public/         # Mapa público sin auth (/puntos)
│   ├── recommendations/# Recomendaciones derivadas del análisis
│   └── reports/        # Reportes y exportaciones
├── router/
│   └── index.ts        # Rutas + guard de auth/rol
├── shared/
│   ├── api/
│   │   └── axios.ts    # Cliente HTTP + normalización de errores
│   ├── components/     # Componentes reutilizables (ConfirmDialog, Navbar)
│   ├── composables/    # useAuth y otros composables globales
│   ├── types/          # Tipos compartidos
│   └── utils/          # Helpers generales
└── styles/             # CSS global + Tailwind base
```

---

## Vistas y control de acceso

| Ruta | Rol requerido | Descripción |
|------|--------------|-------------|
| `/` | Ninguno (redirige si logueado) | Login |
| `/puntos` | Ninguno | Mapa público de puntos de acopio |
| `/analisis` | `analista` o `admin` | Análisis geoespacial interactivo |
| `/reportes` | `analista` o `admin` | Reportes y exportaciones |
| `/panel-ml` | `admin` | Inferencia ML, activación de modelos, recálculo de cobertura |
| `/admin/usuarios` | `admin` | CRUD de usuarios del sistema |

El guard en `router/index.ts` redirige a `/analisis` si un analista intenta acceder a una ruta `requiresAdmin`, y a `/` si no hay sesión activa.

---

## Build y tests

```bash
# Build de producción
npm run build       # genera dist/

# Vista previa del build
npm run preview

# Tests unitarios
npm test            # vitest run (single pass, sin watch)
```

Los tests viven junto a sus módulos o en `src/**/*.spec.ts`. Cubren stores, composables y lógica de dominio crítica (no componentes visuales).

---

## Despliegue

La app se despliega como sitio estático en **Azure Static Web Apps** vía GitHub Actions.

El workflow de CI construye la app con `npm run build` y publica el contenido de `dist/`. `VITE_API_URL` se lee desde los secrets del repositorio en GitHub y se pasa como variable de entorno al step de build:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

No hay servidor Node en producción; el routing client-side requiere que Azure Static Web Apps tenga configurada la regla de fallback a `index.html` (archivo `staticwebapp.config.json` en la raíz del proyecto).
