<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border p-8">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <KeyRound class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">
          Recuperar contraseña
        </h1>
        <p class="text-sm text-muted-foreground text-center mt-1">
          Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
        </p>
      </div>

      <!-- Mismo mensaje exista o no la cuenta: no revela qué correos están registrados. -->
      <div
        v-if="enviado"
        role="status"
        data-prueba="mensaje-neutro"
        class="mb-5 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 text-center"
      >
        Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
      </div>

      <form
        v-else
        class="space-y-5"
        novalidate
        @submit.prevent="onSubmit"
      >
        <div>
          <label
            for="recuperar-email"
            class="block text-sm font-medium text-muted-foreground mb-2"
          >Correo electrónico</label>
          <input
            id="recuperar-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="correo@ejemplo.com"
            class="w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
        </div>

        <button
          type="submit"
          :disabled="enviando"
          class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {{ enviando ? 'Enviando…' : 'Enviar enlace' }}
        </button>

        <p
          v-if="errorMessage"
          role="alert"
          class="text-sm text-destructive text-center"
        >
          {{ errorMessage }}
        </p>
      </form>

      <p class="mt-6 text-center">
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
import { ref } from 'vue'
import { KeyRound } from '@lucide/vue'
import { AuthRepository } from '../repositories/AuthRepository'
import { respuestaHttp } from '../utils/respuestaHttp'

const email = ref('')
const enviando = ref(false)
const enviado = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  const correo = email.value.trim()
  if (!correo) { errorMessage.value = 'Ingresa tu correo electrónico.'; return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { errorMessage.value = 'Ingresa un correo electrónico válido.'; return }

  enviando.value = true
  try {
    await AuthRepository.forgotPassword(correo)
    enviado.value = true
  } catch (error) {
    // Cualquier respuesta del servidor muestra el mensaje neutro; solo sin respuesta (red caída) se avisa del error.
    if (respuestaHttp(error)) enviado.value = true
    else errorMessage.value = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
  } finally {
    enviando.value = false
  }
}
</script>
