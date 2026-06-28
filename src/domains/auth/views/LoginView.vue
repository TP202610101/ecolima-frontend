<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border p-8">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <Recycle class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">EcoLima ML</h1>
        <p class="text-sm text-muted-foreground text-center mt-1">
          Sistema de Recomendación de Ubicaciones<br>Municipalidad de Lima
        </p>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-muted-foreground mb-2">Correo electrónico</label>
          <input
            v-model="email"
            type="email"
            placeholder="correo@ejemplo.com"
            class="w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-muted-foreground mb-2">Contraseña</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <button
          type="submit"
          class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Iniciar sesión
        </button>

        <p v-if="errorMessage" class="text-sm text-destructive text-center">{{ errorMessage }}</p>
      </form>

    </div>
    <p class="mt-6 text-xs text-muted-foreground">© 2026 EcoLima ML</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Recycle } from '@lucide/vue'
import { LoginUseCase } from '../use-cases/LoginUseCase'
import { useAuthStore } from '../stores/useAuthStore'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const router = useRouter()
const auth = useAuthStore()

async function onSubmit() {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Completa email y contraseña.'
    return
  }

  try {
    const result = await LoginUseCase(email.value, password.value)
    auth.setSession(result.user, result.access_token)
    router.push({ name: 'analisis' })
  } catch (error: any) {
    if (error.response?.status === 401) {
      errorMessage.value = 'Credenciales inválidas. Intenta de nuevo.'
    } else {
      errorMessage.value = 'No fue posible iniciar sesión. Verifica tus datos.'
    }
  }
}
</script>
