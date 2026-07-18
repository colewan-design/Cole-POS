<script setup lang="ts">
import { Eye, EyeOff, X } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import { useAuthStore } from '@pos/core/stores/auth'

const props = defineProps<{
  roleOptions: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const auth = useAuthStore()

const defaultRoleId = computed(() => {
  if (props.roleOptions.some((option) => option.value === 'cashier')) {
    return 'cashier'
  }
  return props.roleOptions[0]?.value ?? ''
})

const form = reactive({
  fullName: '',
  username: '',
  password: '',
  roleId: defaultRoleId.value,
})

const passwordVisible = ref(false)
const saving = ref(false)

const isValid = computed(
  () =>
    form.fullName.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.password.trim().length >= 6 &&
    form.roleId.length > 0,
)

async function save() {
  if (!isValid.value || saving.value) return

  saving.value = true
  try {
    const created = await auth.createStaffAccount({ ...form })
    if (created) {
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="sheet-overlay"
      role="dialog"
      aria-label="Add employee"
      @click="handleOverlayClick"
      @keydown="handleKeydown"
    >
      <div class="sheet-panel add-employee-sheet">
        <div class="sheet-grabber" />

        <div class="sheet-scroll add-employee-sheet__scroll">
          <div class="add-employee-sheet__header">
            <h2 class="panel-title">Add employee</h2>
            <button class="icon-button" type="button" aria-label="Close" @click="emit('close')">
              <X :size="18" />
            </button>
          </div>

          <form class="add-employee-sheet__form" @submit.prevent="save">
            <div class="ps-field">
              <p class="section-label">Full name</p>
              <input v-model="form.fullName" class="sheet-input" type="text" autocomplete="name" placeholder="Employee's full name" />
            </div>

            <div class="ps-field">
              <p class="section-label">Username</p>
              <input v-model="form.username" class="sheet-input" type="text" autocomplete="off" placeholder="Login username" />
            </div>

            <div class="ps-field">
              <p class="section-label">Password</p>
              <div class="auth-password-field">
                <input
                  v-model="form.password"
                  class="sheet-input"
                  :type="passwordVisible ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="At least 6 characters"
                />
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
            </div>

            <div class="ps-field">
              <p class="section-label">Role</p>
              <AutocompleteSelect v-model="form.roleId" label="Role" :options="roleOptions" />
            </div>

            <p v-if="auth.authError" class="auth-error">{{ auth.authError }}</p>

            <button class="primary-button add-employee-sheet__submit" type="submit" :disabled="!isValid || saving">
              {{ saving ? 'Creating…' : 'Add employee' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.add-employee-sheet {
  width: min(480px, 100%);
}

.add-employee-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.add-employee-sheet__form {
  display: grid;
  gap: var(--space-4);
}

.add-employee-sheet__submit {
  width: 100%;
  min-height: 48px;
}
</style>
