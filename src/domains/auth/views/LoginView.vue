<template>
  <div class="max-w-md mx-auto mt-24 bg-white p-6 rounded shadow">
    <h1 class="text-2xl font-bold mb-4">EcoLima ML</h1>
    <form @submit.prevent="onSubmit" class="space-y-4">
      <input v-model="email" type="email" placeholder="Email" class="w-full p-2 border rounded" />
      <input v-model="password" type="password" placeholder="Password" class="w-full p-2 border rounded" />
      <button class="w-full bg-green-600 text-white py-2 rounded">Iniciar sesión</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { LoginUseCase } from '../use-cases/LoginUseCase'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
  try {
    const user = await LoginUseCase(email.value, password.value)
    auth.setUser(user)
    router.push('/analisis')
  } catch (err) {
    alert('Error iniciando sesión')
  }
}
</script>
