<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { UserPlus, Users } from '@lucide/vue'
import { useAdminUsersStore } from '../stores/useAdminUsersStore'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const store = useAdminUsersStore()
const auth = useAuthStore()

// ── Create modal ────────────────────────────────────────────────────────────
const showCreate = ref(false)
const form = reactive({ email: '', fullName: '', password: '', role: 'analista' as 'admin' | 'analista' })
const formError = ref('')

function openCreate() {
  form.email = ''; form.fullName = ''; form.password = ''; form.role = 'analista'
  formError.value = ''
  store.createError = null
  showCreate.value = true
}

function validateForm(): string | null {
  if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Ingresa un email válido.'
  if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  return null
}

async function submitCreate() {
  const err = validateForm()
  if (err) { formError.value = err; return }
  formError.value = ''
  const ok = await store.createUser({
    email: form.email,
    password: form.password,
    full_name: form.fullName || undefined,
    role: form.role,
  })
  if (ok) showCreate.value = false
  else formError.value = store.createError ?? 'Error al crear usuario'
}

// ── Confirm dialog ───────────────────────────────────────────────────────────
const confirm = ref<{
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  variant: 'normal' | 'danger'
  action: () => void
}>({ visible: false, title: '', message: '', confirmLabel: '', variant: 'normal', action: () => {} })

function handleRoleChange(userId: number, email: string, newRole: 'admin' | 'analista') {
  confirm.value = {
    visible: true,
    title: 'Cambiar rol',
    message: `¿Cambiar el rol de ${email} a "${newRole}"?`,
    confirmLabel: 'Cambiar',
    variant: 'normal',
    action: () => store.updateRole(userId, newRole),
  }
}

function handleDeactivate(userId: number, email: string) {
  confirm.value = {
    visible: true,
    title: 'Desactivar usuario',
    message: `¿Desactivar a ${email}? Perderá acceso al sistema inmediatamente.`,
    confirmLabel: 'Desactivar',
    variant: 'danger',
    action: () => store.updateStatus(userId, false),
  }
}

function handleActivate(userId: number, email: string) {
  confirm.value = {
    visible: true,
    title: 'Activar usuario',
    message: `¿Activar a ${email}?`,
    confirmLabel: 'Activar',
    variant: 'normal',
    action: () => store.updateStatus(userId, true),
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isSelf(userId: number): boolean {
  return userId === auth.user?.user_id
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') showCreate.value = false
}

onMounted(() => {
  store.fetchUsers()
  document.addEventListener('keydown', onEscape)
})

onUnmounted(() => document.removeEventListener('keydown', onEscape))
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-foreground">Gestión de usuarios</h1>
          <p class="text-sm text-muted-foreground mt-1">Administra los accesos al sistema</p>
        </div>
        <button
          @click="openCreate"
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors"
        >
          <UserPlus class="w-4 h-4" />
          Crear usuario
        </button>
      </div>

      <!-- Action error banner -->
      <div v-if="store.actionError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ store.actionError }}</p>
      </div>

      <!-- Users table -->
      <div class="bg-white rounded-lg border border-border overflow-hidden">

        <div class="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users class="w-4 h-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Usuarios del sistema</h2>
        </div>

        <div v-if="store.loading" class="p-4 space-y-3">
          <div v-for="i in 4" :key="i" class="h-12 bg-gray-100 rounded animate-pulse" />
        </div>

        <div
          v-else-if="!store.users.length"
          class="flex flex-col items-center justify-center py-14 text-center"
        >
          <Users class="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p class="text-sm text-muted-foreground">No hay usuarios registrados</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in store.users"
                :key="user.user_id"
                class="border-b border-border hover:bg-secondary transition-colors last:border-0"
                :class="isSelf(user.user_id) ? 'bg-blue-50/40' : ''"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <span class="text-foreground">{{ user.email }}</span>
                    <span v-if="isSelf(user.user_id)" class="text-xs text-blue-600 font-medium">(tú)</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ user.full_name || '—' }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
                    ]"
                  >{{ user.role }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500',
                    ]"
                  >{{ user.is_active ? 'Activo' : 'Inactivo' }}</span>
                </td>
                <td class="px-4 py-3 text-muted-foreground text-xs">{{ fmtDate(user.created_at) }}</td>
                <td class="px-4 py-3">
                  <div v-if="isSelf(user.user_id)" class="text-xs text-muted-foreground italic">Tu cuenta</div>
                  <div v-else class="flex items-center gap-2 flex-wrap">
                    <!-- Cambiar rol -->
                    <button
                      @click="handleRoleChange(user.user_id, user.email, user.role === 'admin' ? 'analista' : 'admin')"
                      :disabled="store.actionUserId !== null"
                      class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span v-if="store.actionUserId === user.user_id" class="w-2.5 h-2.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                      → {{ user.role === 'admin' ? 'Analista' : 'Admin' }}
                    </button>
                    <!-- Activar / Desactivar -->
                    <button
                      v-if="user.is_active"
                      @click="handleDeactivate(user.user_id, user.email)"
                      :disabled="store.actionUserId !== null"
                      class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >Desactivar</button>
                    <button
                      v-else
                      @click="handleActivate(user.user_id, user.email)"
                      :disabled="store.actionUserId !== null"
                      class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-green-200 text-green-700 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >Activar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>

  <!-- ── Create user modal ────────────────────────────────────────────────── -->
  <div
    v-if="showCreate"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-user-title"
  >
    <div class="absolute inset-0 bg-black/50" @click="showCreate = false" />
    <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">

      <h2 id="create-user-title" class="text-base font-semibold text-foreground">Crear usuario</h2>

      <div class="space-y-4">
        <!-- Email -->
        <div>
          <label class="block text-xs font-medium text-foreground mb-1">Email <span class="text-red-500">*</span></label>
          <input
            v-model="form.email"
            type="email"
            placeholder="usuario@ejemplo.com"
            autocomplete="off"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <!-- Nombre -->
        <div>
          <label class="block text-xs font-medium text-foreground mb-1">Nombre completo</label>
          <input
            v-model="form.fullName"
            type="text"
            placeholder="Nombre (opcional)"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <!-- Password -->
        <div>
          <label class="block text-xs font-medium text-foreground mb-1">Contraseña <span class="text-red-500">*</span></label>
          <input
            v-model="form.password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autocomplete="new-password"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <!-- Rol -->
        <div>
          <label class="block text-xs font-medium text-foreground mb-1">Rol <span class="text-red-500">*</span></label>
          <select
            v-model="form.role"
            class="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="analista">Analista</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <!-- Error -->
      <p v-if="formError" class="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">{{ formError }}</p>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-1">
        <button
          @click="showCreate = false"
          class="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-secondary transition-colors"
        >Cancelar</button>
        <button
          @click="submitCreate"
          :disabled="store.creating"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="store.creating" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ store.creating ? 'Creando...' : 'Crear usuario' }}
        </button>
      </div>

    </div>
  </div>

  <!-- ── Confirm dialog ────────────────────────────────────────────────────── -->
  <ConfirmDialog
    v-if="confirm.visible"
    :title="confirm.title"
    :message="confirm.message"
    :confirm-label="confirm.confirmLabel"
    :variant="confirm.variant"
    @confirm="() => { confirm.action(); confirm.visible = false }"
    @cancel="confirm.visible = false"
  />
</template>
