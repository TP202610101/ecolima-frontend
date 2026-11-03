# Ejecución local del frontend de EcoLima

Guía para levantar el frontend desde cero en una máquina limpia. Está pensada para el grupo que evalúa el sistema en las pruebas cruzadas. Rama de referencia: `docs/software-a-probar`, que tiene el mismo código que `v1.0.0-ajustes` más esta documentación.

## 1. Requisitos

| Requisito | Versión | Por qué |
|---|---|---|
| Node.js | 20.19 o superior en la rama 20, o 22.13 o superior en la rama 22 | Lo exigen ESLint 10, jsdom 29 y Vitest 4 (`engines` de cada paquete). El despliegue usa Node 20 (`NODE_VERSION: "20"` en el workflow) |
| npm | 10 o superior | El proyecto usa `package-lock.json` (lockfileVersion 3). No hay configuración para yarn ni pnpm |
| Navegador | Chrome, Edge o Firefox recientes | El mapa usa WebGL (MapLibre GL JS 6.9.1) |
| Internet | Necesario para el mapa base | Las teselas vienen de OpenFreeMap (`https://tiles.openfreemap.org`). Sin conexión, después de 8 segundos el mapa de Análisis muestra solo los límites distritales |
| Backend de EcoLima | Repositorio `ecolima-backend`, corriendo en `http://127.0.0.1:9000` (o la URL del backend desplegado que entregue el equipo) | El frontend no trae datos propios. El backend debe tener importado el paquete de resultados 1.0.0; si no lo tiene, Análisis y Reportes muestran «Todavía no hay resultados V1 cargados en el servidor.» Cómo levantarlo (base de datos, migraciones, importación del paquete y cuentas) se explica en la documentación de ese repositorio, no aquí. Para comprobar que está listo: `http://127.0.0.1:9000/health` debe responder `"db":"connected"` |
| Cuentas de prueba | Una de rol analista y otra de administrador | Las entrega el equipo. El frontend no permite registrarse; el rol ciudadano no necesita cuenta |

## 2. Variables de entorno

El frontend lee una sola variable. Vite la incrusta al compilar, así que después de cambiarla hay que reiniciar `npm run dev` o volver a compilar.

| Variable | ¿Obligatoria? | Ejemplo | Dónde se usa |
|---|---|---|---|
| `VITE_API_URL` | Sí en la práctica. Si queda vacía, las peticiones van al mismo origen del frontend y fallan | `http://127.0.0.1:9000` (local) o `https://ecolimabackend-bcbmf4d9dufngddy.eastus2-01.azurewebsites.net` (desplegado) | `src/shared/api/axios.ts` y `src/domains/public/repositories/PublicRepository.ts` |

Ninguna otra variable del archivo `.env.local` se lee en el código; por ejemplo, `VITE_CARTO_API_KEY` es un resto del prototipo.

## 3. Pasos desde cero

```bash
# 1. Clonar y entrar a la rama
git clone https://github.com/TP202610101/ecolima-frontend.git
cd ecolima-frontend
git switch docs/software-a-probar

# 2. Instalar dependencias exactamente como en el lockfile (tarda alrededor de un minuto)
npm ci
# Al final npm avisa de vulnerabilidades en dependencias (35 al 2 de noviembre de 2026).
# Es un aviso conocido; no ejecutes "npm audit fix --force", porque cambia versiones mayores.

# 3. Configurar la URL del backend
cp .env.example .env.local      # en Windows PowerShell: Copy-Item .env.example .env.local
# Edita .env.local si el backend no está en http://127.0.0.1:9000

# 4. Levantar en modo desarrollo
npm run dev
# Abre http://localhost:5173 (usa "localhost", no "127.0.0.1": el backend solo acepta ese origen por CORS)
```

## 4. Comandos

| Tarea | Comando | Resultado esperado hoy |
|---|---|---|
| Desarrollo | `npm run dev` | Servidor de Vite en `http://localhost:5173`, con recarga automática |
| Compilación de producción | `npm run build` | Carpeta `dist/` (aviso de Vite por un bundle de más de 500 kB; es esperado) |
| Servir la compilación | `npm run preview` | `http://localhost:4173`. El backend debe aceptar ese origen en CORS (variable `CORS_ALLOWED_ORIGINS` del backend) |
| Pruebas unitarias y de componentes | `npm test` (equivale a `vitest run`) | 23 archivos, 138 pruebas, todas aprobadas (Vitest 4.1.9, entorno jsdom) |
| Lint | `npm run lint` | 0 errores y 15 advertencias |
| Pruebas de extremo a extremo | No existen en el repositorio | No hay Playwright, Cypress ni carpeta `e2e/` |
| Verificación de tipos | No hay comando | `vite build` no verifica tipos y `vue-tsc` no está instalado |

## 5. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Error de CORS en la consola o «No se pudo conectar con el servidor…» | El frontend se abrió con `127.0.0.1:5173`, o el backend está apagado | Abrir `http://localhost:5173` y comprobar `http://127.0.0.1:9000/health` |
| «Todavía no hay resultados V1 cargados en el servidor.» | El backend no tiene importado el paquete 1.0.0 | Importar el paquete en el backend (ver su documentación) |
| El mapa se ve gris, con solo los límites | Sin acceso a `tiles.openfreemap.org` | Revisar la conexión a internet o un proxy que bloquee el dominio |
| Vuelve al login con «Tu sesión expiró, vuelve a iniciar sesión.» | El token JWT expiró | Iniciar sesión otra vez |
| `npm ci` falla por la versión de Node | Node anterior a 20.19 | Instalar Node 20.19 o superior, o 22.13 o superior |
| `npm run dev` abre en el puerto 5174 u otro | El 5173 ya estaba ocupado | Cerrar el otro proceso y volver a lanzar; el backend solo acepta `http://localhost:5173` |
| El login responde «Demasiados intentos de inicio de sesión. Espera un momento e intenta de nuevo.» | El backend admite 5 intentos de inicio de sesión por minuto desde la misma IP | Esperar un minuto |
| `git switch docs/software-a-probar` responde «invalid reference» | La rama todavía no está publicada en GitHub | Usar la rama que indique el equipo |
