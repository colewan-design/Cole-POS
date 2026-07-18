<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface SignupRow {
  organizationSlug: string
  organizationName: string
  status: string
  plan: string
  amountCents: number
  gcashReference: string
  submittedAt: string | null
  verifiedAt: string | null
}

const SECRET_STORAGE_KEY = 'platform_admin_secret'

const secretInput = ref('')
const secret = ref('')
const unlocked = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const rows = ref<SignupRow[]>([])
const verifyingSlug = ref('')

function formatPesos(amountCents: number) {
  return `₱${(amountCents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function callApi(body: Record<string, unknown>) {
  const response = await fetch('/api/platform-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.')
  }
  return data
}

async function loadSignups(candidateSecret: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await callApi({ action: 'list', secret: candidateSecret })
    rows.value = data.signups ?? []
    secret.value = candidateSecret
    unlocked.value = true
    window.sessionStorage.setItem(SECRET_STORAGE_KEY, candidateSecret)
  } catch (err) {
    unlocked.value = false
    window.sessionStorage.removeItem(SECRET_STORAGE_KEY)
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

async function submitSecret() {
  if (!secretInput.value.trim()) return
  await loadSignups(secretInput.value.trim())
}

async function markVerified(organizationSlug: string) {
  verifyingSlug.value = organizationSlug
  try {
    await callApi({ action: 'verify', secret: secret.value, organizationSlug })
    const row = rows.value.find((r) => r.organizationSlug === organizationSlug)
    if (row) {
      row.status = 'active'
      row.verifiedAt = new Date().toISOString()
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to verify that store.'
  } finally {
    verifyingSlug.value = ''
  }
}

onMounted(() => {
  const stored = window.sessionStorage.getItem(SECRET_STORAGE_KEY)
  if (stored) {
    void loadSignups(stored)
  }
})
</script>

<template>
  <div class="pa-page">
    <section v-if="!unlocked" class="auth-page">
      <section class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-mark">C</div>
          <strong>Platform admin</strong>
        </div>
        <form class="auth-form" @submit.prevent="submitSecret">
          <label class="settings-field">
            <span class="settings-row__label">Secret</span>
            <input v-model="secretInput" class="sheet-input" type="password" autocomplete="off">
          </label>
          <button class="primary-button auth-submit" type="submit" :disabled="loading">
            {{ loading ? 'Checking…' : 'Unlock' }}
          </button>
        </form>
        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>
      </section>
    </section>

    <section v-else class="pa-content">
      <div class="pa-header">
        <h1 class="pa-title">Pending signups</h1>
        <p class="pa-copy">Review GCash references and mark payments verified.</p>
      </div>

      <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

      <div class="pa-table-wrap surface-panel">
        <table class="pa-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>GCash reference</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.organizationSlug">
              <td>
                <strong>{{ row.organizationName }}</strong>
                <div class="pa-slug">{{ row.organizationSlug }}</div>
              </td>
              <td>{{ row.plan }}</td>
              <td>{{ formatPesos(row.amountCents) }}</td>
              <td>{{ row.gcashReference }}</td>
              <td>{{ formatDate(row.submittedAt) }}</td>
              <td>
                <span class="pa-badge" :class="{ 'pa-badge--active': row.status === 'active' }">
                  {{ row.status === 'active' ? 'Verified' : 'Pending' }}
                </span>
              </td>
              <td>
                <button
                  v-if="row.status !== 'active'"
                  class="segment-button"
                  type="button"
                  :disabled="verifyingSlug === row.organizationSlug"
                  @click="markVerified(row.organizationSlug)"
                >
                  {{ verifyingSlug === row.organizationSlug ? 'Verifying…' : 'Mark verified' }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="pa-empty">No signups yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pa-page {
  min-height: 100vh;
  background: var(--bg-canvas);
}

.pa-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: grid;
  gap: var(--space-5);
}

.pa-header {
  display: grid;
  gap: var(--space-1);
}

.pa-title {
  margin: 0;
  font: var(--type-title1);
  color: var(--text-primary);
}

.pa-copy {
  margin: 0;
  color: var(--text-secondary);
}

.pa-table-wrap {
  overflow-x: auto;
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-xl);
}

.pa-table {
  width: 100%;
  border-collapse: collapse;
  font: var(--type-subhead);
}

.pa-table th,
.pa-table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 0.5px solid var(--separator);
  white-space: nowrap;
  color: var(--text-primary);
}

.pa-table th {
  color: var(--text-secondary);
  font: var(--type-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pa-table tr:last-child td {
  border-bottom: none;
}

.pa-slug {
  font: var(--type-caption);
  color: var(--text-tertiary);
}

.pa-badge {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--warning) 14%, transparent);
  color: var(--warning);
  font: var(--type-caption);
  font-weight: 600;
}

.pa-badge--active {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}

.pa-empty {
  text-align: center;
  color: var(--text-secondary);
}
</style>
