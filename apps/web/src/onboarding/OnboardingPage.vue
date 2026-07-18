<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import { businessModeLabel, type BusinessMode } from '@pos/shared/index'
import { writePendingInitialSettings, writeStaffTenant } from '@pos/web/tenantBinding'
import { GCASH_ACCOUNT_NAME, GCASH_NUMBER, PLAN_PRICE_PESOS } from './pricingConstants'

const mode = ref<'signup' | 'pair'>('signup')
const saving = ref(false)
const errorMessage = ref('')
const passwordVisible = ref(false)

const businessModeOptions = (['coffee-shop', 'grocery', 'restaurant', 'nail-salon'] as const).map((value) => ({
  value,
  label: businessModeLabel(value),
}))

const signupForm = reactive({
  businessName: '',
  ownerFullName: '',
  username: '',
  password: '',
  businessMode: 'coffee-shop' as BusinessMode,
  gcashReference: '',
})

const pairForm = reactive({
  pairingCode: '',
})

const priceLabel = computed(() => `₱${PLAN_PRICE_PESOS.toLocaleString('en-PH')}/month`)

function clearError() {
  errorMessage.value = ''
}

function bindAndEnter(
  body: { organizationSlug?: string; storeCode?: string; error?: string },
  fallbackError: string,
): boolean {
  if (!body.organizationSlug || !body.storeCode) {
    errorMessage.value = body.error || fallbackError
    return false
  }
  writeStaffTenant({ organizationSlug: body.organizationSlug, storeCode: body.storeCode })
  return true
}

async function submitSignup() {
  clearError()
  if (saving.value) return
  saving.value = true
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupForm),
    })
    const body = await response.json().catch(() => ({})) as { organizationSlug?: string; storeCode?: string; error?: string }
    if (!response.ok) {
      errorMessage.value = body.error || 'Unable to create your store.'
      return
    }
    if (bindAndEnter(body, 'Unable to create your store.')) {
      // Only on signup — pairing binds to an *existing* store, which already
      // has its own settings that must not be reset.
      writePendingInitialSettings({ businessName: signupForm.businessName, businessMode: signupForm.businessMode })
      window.location.href = '/app'
    }
  } catch {
    errorMessage.value = 'Something went wrong — check your connection and try again.'
  } finally {
    saving.value = false
  }
}

async function submitPairing() {
  clearError()
  if (saving.value) return
  saving.value = true
  try {
    const response = await fetch('/api/resolve-staff-store-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pairForm.pairingCode }),
    })
    const body = await response.json().catch(() => ({})) as { organizationSlug?: string; storeCode?: string; error?: string }
    if (!response.ok) {
      errorMessage.value = body.error || 'Unable to find that store.'
      return
    }
    if (bindAndEnter(body, 'Unable to find that store.')) {
      window.location.href = '/app'
    }
  } catch {
    errorMessage.value = 'Something went wrong — check your connection and try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-brand">
        <div class="auth-brand-mark">C</div>
        <strong>ColePOS</strong>
      </div>

      <div class="segmented-control auth-mode-switch" role="group" aria-label="Get started mode">
        <button
          class="segment-button"
          :class="{ active: mode === 'signup' }"
          type="button"
          @click="mode = 'signup'; clearError()"
        >
          <span>Sign up</span>
        </button>
        <button
          class="segment-button"
          :class="{ active: mode === 'pair' }"
          type="button"
          @click="mode = 'pair'; clearError()"
        >
          <span>I already have a store</span>
        </button>
      </div>

      <div v-if="mode === 'signup'" class="auth-card__hero">
        <h1 class="auth-card__title">Create your store</h1>
        <p class="auth-card__copy">Set up your business and start selling right away.</p>
      </div>
      <div v-else class="auth-card__hero">
        <h1 class="auth-card__title">Welcome back</h1>
        <p class="auth-card__copy">Enter your store's code to set up this device.</p>
      </div>

      <Transition name="auth-form-fade" mode="out-in">
        <form v-if="mode === 'signup'" key="signup" class="auth-form" @submit.prevent="submitSignup">
          <label class="settings-field">
            <span class="settings-row__label">Business name</span>
            <input v-model="signupForm.businessName" class="sheet-input" type="text" autocomplete="organization">
          </label>
          <label class="settings-field">
            <span class="settings-row__label">Your full name</span>
            <input v-model="signupForm.ownerFullName" class="sheet-input" type="text" autocomplete="name">
          </label>
          <label class="settings-field">
            <span class="settings-row__label">Username</span>
            <input v-model="signupForm.username" class="sheet-input" type="text" autocomplete="username">
          </label>
          <label class="settings-field">
            <span class="settings-row__label">Password</span>
            <div class="auth-password-field">
              <input
                v-model="signupForm.password"
                class="sheet-input"
                :type="passwordVisible ? 'text' : 'password'"
                autocomplete="new-password"
              >
              <button
                class="auth-password-toggle"
                type="button"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                @click="passwordVisible = !passwordVisible"
              >
                <EyeOff v-if="passwordVisible" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </label>
          <label class="settings-field">
            <span class="settings-row__label">Business type</span>
            <AutocompleteSelect v-model="signupForm.businessMode" label="Business type" :options="businessModeOptions" />
          </label>

          <div class="onboarding-payment">
            <p class="onboarding-payment__title">Pay via GCash — {{ priceLabel }}</p>
            <p class="onboarding-payment__detail">Send to <strong>{{ GCASH_NUMBER }}</strong> ({{ GCASH_ACCOUNT_NAME }})</p>
            <p class="onboarding-payment__helper">Your store activates immediately — we'll verify the payment shortly after.</p>
          </div>

          <label class="settings-field">
            <span class="settings-row__label">GCash reference number</span>
            <input v-model="signupForm.gcashReference" class="sheet-input" type="text" autocomplete="off">
          </label>

          <button class="primary-button auth-submit" type="submit" :disabled="saving">
            {{ saving ? 'Creating your store…' : 'Create your store' }}
          </button>
        </form>

        <form v-else key="pair" class="auth-form" @submit.prevent="submitPairing">
          <label class="settings-field">
            <span class="settings-row__label">Store code</span>
            <input v-model="pairForm.pairingCode" class="sheet-input" type="text" autocomplete="off" placeholder="e.g. DEMO01">
          </label>
          <button class="primary-button auth-submit" type="submit" :disabled="saving">
            {{ saving ? 'Connecting…' : 'Continue' }}
          </button>
        </form>
      </Transition>

      <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<style scoped>
.onboarding-payment {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--fill);
  display: grid;
  gap: var(--space-1);
}

.onboarding-payment__title {
  margin: 0;
  font: var(--type-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.onboarding-payment__detail {
  margin: 0;
  font: var(--type-subhead);
  color: var(--text-primary);
}

.onboarding-payment__helper {
  margin: 0;
  font: var(--type-caption);
  color: var(--text-secondary);
}
</style>
