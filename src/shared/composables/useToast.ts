import { readonly, ref } from 'vue'

// Aviso breve de toda la aplicación: lo muestra ToastGlobal.vue (montado en App.vue). Estado de módulo porque
// también lo usan el router y los stores, fuera de un componente. Un aviso nuevo reemplaza al anterior.
const DURACION_MS = 3500
const mensaje = ref<string | null>(null)
let temporizador: ReturnType<typeof setTimeout> | null = null

export const mensajeToast = readonly(mensaje)

export function mostrarToast(texto: string) {
  mensaje.value = texto
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => { mensaje.value = null }, DURACION_MS)
}
