<script setup lang="ts">
import { Eye } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@pos/core/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const loginForm = ref({
  username: '',
  password: '',
})
const registerForm = ref({
  fullName: '',
  username: '',
  password: '',
})

const registerHint = computed(() =>
  auth.hasUsers
    ? 'New accounts start as Cashier and can be reassigned by an admin later.'
    : 'The first account becomes the Admin account for this register.',
)

function resolveDestination() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect || `/${auth.firstAccessiblePage === 'register' ? '' : auth.firstAccessiblePage ?? ''}`.replace(/\/$/, '/') 
}

async function goToApp() {
  const destination = resolveDestination()
  await router.replace(destination)
}

async function submitLogin() {
  const success = await auth.login(loginForm.value.username, loginForm.value.password)
  if (!success) {
    return
  }

  await goToApp()
}

async function submitRegistration() {
  const success = await auth.register(registerForm.value)
  if (!success) {
    return
  }

  await goToApp()
}

async function continueAsGuest() {
  const success = await auth.loginAsGuest()
  if (!success) {
    return
  }

  await goToApp()
}

onMounted(async () => {
  await auth.initialize()
  mode.value = auth.hasUsers ? 'login' : 'register'
})
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-card__hero">
        <p class="auth-card__eyebrow">Access control</p>
        <h1 class="auth-card__title">Sign in to your POS workspace.</h1>
        <p class="auth-card__copy">
          User accounts are stored on this device, and each role can be allowed or blocked per page.
        </p>
      </div>

      <div class="segmented-control auth-mode-switch" role="group" aria-label="Authentication mode">
        <button
          class="segment-button"
          :class="{ active: mode === 'login' }"
          type="button"
          @click="mode = 'login'; auth.clearAuthError()"
        >
          <span>Login</span>
        </button>
        <button
          class="segment-button"
          :class="{ active: mode === 'register' }"
          type="button"
          @click="mode = 'register'; auth.clearAuthError()"
        >
          <span>Register</span>
        </button>
      </div>

      <button class="segment-button auth-guest-button" type="button" @click="continueAsGuest">
        <Eye :size="16" />
        <span>Continue as Guest</span>
      </button>

      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="submitLogin">
        <label class="settings-field">
          <span class="settings-row__label">Username</span>
          <input v-model="loginForm.username" class="sheet-input" type="text" autocomplete="username">
        </label>
        <label class="settings-field">
          <span class="settings-row__label">Password</span>
          <input v-model="loginForm.password" class="sheet-input" type="password" autocomplete="current-password">
        </label>
        <button class="primary-button auth-submit" type="submit">Sign in</button>
      </form>

      <form v-else class="auth-form" @submit.prevent="submitRegistration">
        <label class="settings-field">
          <span class="settings-row__label">Full name</span>
          <input v-model="registerForm.fullName" class="sheet-input" type="text" autocomplete="name">
        </label>
        <label class="settings-field">
          <span class="settings-row__label">Username</span>
          <input v-model="registerForm.username" class="sheet-input" type="text" autocomplete="username">
        </label>
        <label class="settings-field">
          <span class="settings-row__label">Password</span>
          <input v-model="registerForm.password" class="sheet-input" type="password" autocomplete="new-password">
        </label>
        <p class="auth-helper">{{ registerHint }}</p>
        <button class="primary-button auth-submit" type="submit">Create account</button>
      </form>

      <p v-if="auth.authError" class="auth-error">{{ auth.authError }}</p>
    </section>
  </div>
</template>
