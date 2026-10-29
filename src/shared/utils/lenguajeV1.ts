// Reglas de lenguaje de las pantallas V1, para revisarlas en las pruebas:
// sin categorías Alta/Media/Baja ni «recomendación»; «probabilidad» e «idoneidad» solo para negarlas.

const CATEGORIAS = /\b(Alta|Media|Baja)\b|prioridad (alta|media|baja)/gi
const CATEGORIAS_MAYUS = /\b(Alta|Media|Baja)\b/g
const RECOMENDAR = /recomend\w*/gi
const NEGABLES = /probabilidad\w*|idone\w*|idóne\w*/gi
// Negación en las 60 letras previas: «no es una probabilidad», «ni idoneidad», «sin …».
const NEGACION = /\b(no|ni|sin|tampoco)\b/i

/** Devuelve los fragmentos que incumplen las reglas (vacío si el texto está bien). */
export function revisarLenguaje(texto: string): string[] {
  const fallos: string[] = []
  for (const m of texto.matchAll(CATEGORIAS_MAYUS)) fallos.push(`categoría: ${m[0]}`)
  for (const m of texto.matchAll(CATEGORIAS)) if (/prioridad/i.test(m[0])) fallos.push(`categoría: ${m[0]}`)
  for (const m of texto.matchAll(RECOMENDAR)) fallos.push(`recomendación: ${m[0]}`)
  for (const m of texto.matchAll(NEGABLES)) {
    const antes = texto.slice(Math.max(0, (m.index ?? 0) - 60), m.index)
    if (!NEGACION.test(antes)) fallos.push(`sin negar: …${antes.slice(-30)}${m[0]}`)
  }
  return fallos
}
