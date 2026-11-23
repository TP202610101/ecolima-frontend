<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border p-8">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <KeyRound class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">
          Nueva contraseña
        </h1>
      </div>

      <!-- Sin token en la URL no hay nada que restablecer -->
      <div
        v-if="!token"
        role="alert"
        data-prueba="sin-token"
        class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-center"
      >
        Este enlace no es válido: le falta el código de restablecimiento. Usa el enlace completo del correo o pide uno nuevo.
      </div>

      <div
        v-else-if="exito"
        role="status"
        data-prueba="exito"
        class="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 text-center"
      >
        Tu contraseña se cambió correctamente. Te llevamos al inicio de sesión…
      </div>

      <div
        v-else-if="enlaceInvalido"
        role="alert"
        data-prueba="enlace-invalido"
        class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-center"
      >
        El enlace no es válido, ya venció o ya se usó. Pide uno nuevo para restablecer tu contraseña.
      </div>

      <form
        v-else
        class="space-y-5"
        novalidate
        @submit.prevent="onSubmit"
      >
        <div>
          <label
            for="restablecer-password"
            class="block text-sm font-medium text-muted-foreground mb-2"
          >Nueva contraseña</label>
          <input
            id="restablecer-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            aria-describedby="restablecer-requisitos"
            class="w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
          <!-- Requisitos: los mismos de «Crear usuario» (shared/utils/politicaContrasena.ts) -->
          <ul
            id="restablecer-requisitos"
            class="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5"
            data-prueba="requisitos"
          >
            <li
              v-for="r in REQUISITOS_CONTRASENA"
              :key="r.k"
              :class="['text-xs', chequeos[r.k] ? 'text-green-600' : 'text-muted-foreground']"
            >
              {{ chequeos[r.k] ? '✓' : '○' }} {{ r.texto }}
            </li>
          </ul>
        </div>

        <div>
          <label
            for="restablecer-confirmar"
            class="block text-sm font-medium text-muted-foreground mb-2"
          >Confirmar contraseña</label>
          <input
            id="restablecer-confirmar"
            v-model="confirmar"
            type="password"
            autocomplete="new-password"
            class="w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
        </div>

        <button
          type="submit"
          :disabled="enviando"
          class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {{ enviando ? 'Guardando…' : 'Cambiar contraseña' }}
        </button>

        <p
          v-if="errorMessage"
          role="alert"
          class="text-sm text-destructive text-center"
        >
          {{ errorMessage }}
        </p>
      </form>

      <p class="mt-6 flex flex-col items-center gap-2 text-center">
        <router-link
          v-if="!token || enlaceInvalido"
          :to="{ name: 'recuperar' }"
          class="text-sm font-medium text-primary hover:underline"
        >
          Pedir un enlace nuevo
        </router-link>
        <router-link
          :to="{ name: 'login' }"
          class="text-sm text-primary hover:underline"
        >
          Volver al inicio de sesión
        </router-link>
      </p>
    </div>
    <p class="mt-6 text-xs text-muted-foreground">
      © 2026 EcoLima ML
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound } from '@lucide/vue'
import { AuthRepository } from '../repositories/AuthRepository'
import { respuestaHttp } from '../utils/respuestaHttp'
import { REQUISITOS_CONTRASENA, cumplePolitica, revisarContrasena } from '@/shared/utils/politicaContrasena'

const RETRASO_REDIRECCION_MS = 3000

const route = useRoute()
const router = useRouter()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token.trim() : ''))

const password = ref('')
const confirmar = ref('')
const enviando = ref(false)
const exito = ref(false)
const enlaceInvalido = ref(false)
const errorMessage = ref('')
const chequeos = computed(() => revisarContrasena(password.value))
let temporizador: ReturnType<typeof setTimeout> | null = null

// El 422 de FastAPI puede traer el mensaje de un validador de Pydantic («Value error, …»).
const limpiarMotivo = (m: string) => m.replace(/^Value error,\s*/i, '')

async function onSubmit() {
  errorMessage.value = ''
  if (!cumplePolitica(chequeos.value)) { errorMessage.value = 'La contraseña no cumple los requisitos de seguridad.'; return }
  if (password.value !== confirmar.value) { errorMessage.value = 'Las contraseñas no coinciden.'; return }

  enviando.value = true
  try {
    await AuthRepository.resetPassword(token.value, password.value)
    exito.value = true
    temporizador = setTimeout(() => router.push({ name: 'login' }), RETRASO_REDIRECCION_MS)
  } catch (error) {
    const r = respuestaHttp(error)
    if (r?.status === 400) enlaceInvalido.value = true
    else if (r?.status === 422) {
      const motivo = error instanceof Error ? limpiarMotivo(error.message) : ''
      errorMessage.value = motivo || 'La contraseña no cumple los requisitos de seguridad.'
    } else if (!r) errorMessage.value = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
    else errorMessage.value = 'No se pudo cambiar la contraseña. Intenta de nuevo en unos minutos.'
  } finally {
    enviando.value = false
  }
}

onUnmounted(() => { if (temporizador) clearTimeout(temporizador) })
</script>
