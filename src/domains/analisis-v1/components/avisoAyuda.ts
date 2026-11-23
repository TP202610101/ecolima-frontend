// Lectura obligatoria de la ayuda del Análisis (./AyudaFuentesV1.vue), sección por sección.
// La primera vez que un analista o administrador abre la ayuda en una sección, no puede cerrarla hasta llegar
// al final de ese texto. El backend guarda cada sección por separado (clave y versión): subir la versión de una
// sección cuando su texto cambie de fondo hace que todos vuelvan a leerla.
export type SeccionAyuda = 'orden' | 'fuentes' | 'modelo'

export const SECCIONES_AYUDA: SeccionAyuda[] = ['orden', 'fuentes', 'modelo']

export const AVISOS_AYUDA: Record<SeccionAyuda, { clave: string; version: string }> = {
  orden: { clave: 'como-se-ordenan', version: '1' },
  fuentes: { clave: 'fuentes-limitaciones', version: '1' },
  modelo: { clave: 'acerca-del-modelo', version: '1' },
}

export const NOMBRE_SECCION_AYUDA: Record<SeccionAyuda, string> = {
  orden: 'Cómo se ordenan',
  fuentes: 'Fuentes y limitaciones',
  modelo: 'Acerca del modelo',
}
