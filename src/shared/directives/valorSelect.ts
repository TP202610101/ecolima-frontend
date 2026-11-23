import type { Directive } from 'vue'

// Valor de un <select> nativo controlado por el estado, sin pisar la elección del usuario.
// Con :value, Vue vuelve a escribir el valor del DOM en cada re-render del componente. En el selector móvil
// de Chrome la opción tocada y el evento change pueden quedar separados; si la vista se re-renderiza en
// medio, el select vuelve al valor anterior y el change lee ese valor (hay que elegir dos veces).
// Esta directiva solo escribe el valor al montar y cuando el valor del estado cambia de verdad.
export const vValorSelect: Directive<HTMLSelectElement, string | number> = {
  mounted(el, { value }) {
    el.value = String(value)
  },
  updated(el, { value, oldValue }) {
    if (value !== oldValue) el.value = String(value)
  },
}
