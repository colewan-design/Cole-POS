<script setup lang="ts">
import { ImagePlus, Plus, Shield, Store, Trash2, Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { appPageKeys, appPageLabel, businessModeLabel } from '@pos/shared/index'
import MenuRow from '@pos/core/components/MenuRow.vue'
import SettingsGroup from '@pos/core/components/SettingsGroup.vue'
import ToggleSwitch from '@pos/core/components/ToggleSwitch.vue'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'
import type { Appearance, AppPageKey, AppSettings, BusinessMode } from '@pos/shared/index'

const store = usePosStore()
const auth = useAuthStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
  if (!auth.isReady) {
    void auth.initialize()
  }
})

const businessModeOptions = (['coffee-shop', 'grocery', 'restaurant'] as const).map((mode) => ({
  value: mode,
  label: businessModeLabel(mode),
}))

const syncModeOptions = [
  { value: 'local-only', label: 'Local-only' },
  { value: 'online-sync', label: 'Online sync' },
]

const appearanceOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const businessNameDraft = ref('')
const businessImageError = ref('')
const newRoleName = ref('')
const activeRoleId = ref('')

const businessNamePlaceholder = computed(() => `${businessModeLabel(store.settings.businessMode)} name`)
const activeRole = computed(() => auth.roles.find((role) => role.id === activeRoleId.value) ?? auth.roles[0] ?? null)
const roleOptions = computed(() =>
  auth.roles.map((role) => ({ value: role.id, label: role.name })),
)
const canDeleteActiveRole = computed(() =>
  !!activeRole.value
  && activeRole.value.id !== 'admin'
  && auth.roles.length > 1
  && !auth.users.some((user) => user.roleId === activeRole.value?.id),
)

watch(
  () => store.settings.businessName,
  (value) => {
    businessNameDraft.value = value
  },
  { immediate: true },
)

watch(
  () => auth.roles,
  (roles) => {
    if (!roles.length) {
      activeRoleId.value = ''
      return
    }

    if (!roles.some((role) => role.id === activeRoleId.value)) {
      activeRoleId.value = roles[0].id
    }
  },
  { immediate: true, deep: true },
)

function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  void store.updateSettings({ ...store.settings, [key]: value })
}

function commitBusinessName() {
  const nextName = businessNameDraft.value.trim()
  if (nextName === store.settings.businessName) {
    businessNameDraft.value = nextName
    return
  }

  businessNameDraft.value = nextName
  updateSetting('businessName', nextName)
}

function setBusinessImage(imageUrl: string) {
  businessImageError.value = ''
  if (imageUrl === store.settings.businessImageUrl) {
    return
  }

  updateSetting('businessImageUrl', imageUrl)
}

function removeBusinessImage() {
  setBusinessImage('')
}

function handleBusinessNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitBusinessName()
  }
}

function handleBusinessImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    businessImageError.value = 'Please choose an image file.'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    if (!result) {
      businessImageError.value = 'Unable to read that image.'
      return
    }

    setBusinessImage(result)
  }
  reader.onerror = () => {
    businessImageError.value = 'Unable to read that image.'
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function renameActiveRole(name: string) {
  if (!activeRole.value) {
    return
  }

  void auth.renameRole(activeRole.value.id, name)
}

function updateRolePermission(page: AppPageKey, allowed: boolean) {
  if (!activeRole.value) {
    return
  }

  void auth.setRolePermission(activeRole.value.id, page, allowed)
}

function addRole() {
  const nextName = newRoleName.value.trim()
  if (!nextName) {
    return
  }

  void auth.createRole(nextName).then((created) => {
    if (!created) {
      return
    }

    const roleId = nextName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    activeRoleId.value = roleId
    newRoleName.value = ''
  })
}

function removeActiveRole() {
  if (!activeRole.value) {
    return
  }

  void auth.deleteRole(activeRole.value.id)
}

function assignUserRole(userId: string, roleId: string) {
  void auth.updateUserRole(userId, roleId)
}
</script>

<template>
  <div class="settings-page">
    <h1 class="settings-page__title">Settings</h1>

    <SettingsGroup label="Business profile">
      <div class="settings-row settings-row--stack settings-profile">
        <div class="settings-profile__header">
          <div class="settings-profile__avatar">
            <img
              v-if="store.settings.businessImageUrl"
              :src="store.settings.businessImageUrl"
              :alt="store.settings.businessName || 'Business profile image'"
            >
            <Store v-else :size="22" />
          </div>

          <div class="settings-profile__copy">
            <p class="settings-row__label">Business image</p>
            <p class="settings-row__description">Upload a logo or storefront photo for your register profile.</p>
          </div>
        </div>

        <div class="settings-profile__actions">
          <label class="settings-upload-button">
            <ImagePlus :size="16" />
            <span>{{ store.settings.businessImageUrl ? 'Change image' : 'Upload image' }}</span>
            <input
              accept="image/*"
              class="settings-upload-button__input"
              type="file"
              @change="handleBusinessImageChange"
            >
          </label>

          <button
            v-if="store.settings.businessImageUrl"
            class="settings-remove-button"
            type="button"
            @click="removeBusinessImage"
          >
            <Trash2 :size="16" />
            <span>Remove</span>
          </button>
        </div>

        <label class="settings-field settings-field--stack">
          <span class="settings-row__label">Business name</span>
          <input
            v-model="businessNameDraft"
            class="sheet-input"
            type="text"
            maxlength="60"
            :placeholder="businessNamePlaceholder"
            @blur="commitBusinessName"
            @keydown="handleBusinessNameKeydown"
          >
        </label>

        <p v-if="businessImageError" class="settings-profile__error">{{ businessImageError }}</p>
      </div>

      <template #footnote>
        Business profile details are saved on this device and shown in the register header.
      </template>
    </SettingsGroup>

    <SettingsGroup label="General">
      <MenuRow
        label="Business mode"
        :options="businessModeOptions"
        :model-value="store.settings.businessMode"
        ariaLabel="Business mode"
        @update:model-value="(value) => updateSetting('businessMode', value as BusinessMode)"
      />
    </SettingsGroup>

    <SettingsGroup label="Data & sync">
      <MenuRow
        label="Sync mode"
        :options="syncModeOptions"
        :model-value="store.settings.syncMode"
        ariaLabel="Sync mode"
        @update:model-value="(value) => updateSetting('syncMode', value as AppSettings['syncMode'])"
      />

      <template #footnote>
        Local-only keeps all data on this device. Switch to Online sync to back up sales and share your catalog
        across registers.
      </template>
    </SettingsGroup>

    <SettingsGroup label="Appearance & behavior">
      <MenuRow
        label="Appearance"
        :options="appearanceOptions"
        :model-value="store.settings.appearance"
        ariaLabel="Appearance"
        @update:model-value="(value) => updateSetting('appearance', value as Appearance)"
      />

      <div class="settings-row settings-row--toggle">
        <div>
          <p class="settings-row__label">Animate total updates</p>
          <p class="settings-row__description">Show a subtle motion when the total changes.</p>
        </div>
        <ToggleSwitch
          :model-value="store.settings.accentTotalAnimation"
          ariaLabel="Animate total updates"
          @update:model-value="(value) => updateSetting('accentTotalAnimation', value)"
        />
      </div>
    </SettingsGroup>

    <SettingsGroup v-if="auth.canManageAccess" label="Access control">
      <div class="settings-row settings-row--stack access-control">
        <div class="access-control__section">
          <div class="access-control__heading">
            <div class="access-control__title">
              <Shield :size="18" />
              <p class="settings-row__label">Role permissions</p>
            </div>
            <p class="settings-row__description">Each page is allowed or blocked per role.</p>
          </div>

          <div class="access-role-tabs">
            <button
              v-for="role in auth.roles"
              :key="role.id"
              class="segment-button"
              :class="{ active: activeRoleId === role.id }"
              type="button"
              @click="activeRoleId = role.id"
            >
              {{ role.name }}
            </button>
          </div>

          <div class="access-role-create">
            <input
              v-model="newRoleName"
              class="sheet-input"
              type="text"
              placeholder="New role name"
              @keydown.enter.prevent="addRole"
            >
            <button class="segment-button access-role-create__button" type="button" @click="addRole">
              <Plus :size="16" />
              <span>Add role</span>
            </button>
          </div>

          <div v-if="activeRole" class="access-role-card">
            <label class="settings-field">
              <span class="settings-row__label">Role name</span>
              <input
                :value="activeRole.name"
                class="sheet-input"
                type="text"
                :disabled="activeRole.id === 'admin'"
                @blur="renameActiveRole(($event.target as HTMLInputElement).value)"
                @keydown.enter.prevent="renameActiveRole(($event.target as HTMLInputElement).value)"
              >
            </label>

            <div class="access-permissions">
              <div v-for="page in appPageKeys" :key="page" class="access-permission-row">
                <div>
                  <p class="settings-row__label">{{ appPageLabel(page) }}</p>
                  <p class="settings-row__description">Allow this role to open the {{ appPageLabel(page) }} page.</p>
                </div>
                <ToggleSwitch
                  :model-value="activeRole.permissions[page]"
                  :ariaLabel="`Allow ${activeRole.name} to access ${appPageLabel(page)}`"
                  @update:model-value="(value) => updateRolePermission(page, value)"
                />
              </div>
            </div>

            <button
              class="settings-remove-button access-role-delete"
              type="button"
              :disabled="!canDeleteActiveRole"
              @click="removeActiveRole"
            >
              <Trash2 :size="16" />
              <span>Delete role</span>
            </button>
          </div>
        </div>

        <div class="access-control__section">
          <div class="access-control__heading">
            <div class="access-control__title">
              <Users :size="18" />
              <p class="settings-row__label">User roles</p>
            </div>
            <p class="settings-row__description">Assign each account to a role.</p>
          </div>

          <div class="access-user-list">
            <div v-for="user in auth.users" :key="user.id" class="access-user-row">
              <div>
                <p class="settings-row__label">{{ user.fullName }}</p>
                <p class="settings-row__description">@{{ user.username }}</p>
              </div>

              <select
                class="sheet-input access-user-select"
                :value="user.roleId"
                @change="assignUserRole(user.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <p v-if="auth.authError" class="settings-profile__error">{{ auth.authError }}</p>
      </div>

      <template #footnote>
        Only Admin accounts can change role permissions or reassign user roles.
      </template>
    </SettingsGroup>

    <p class="settings-page__footnote">Changes are saved automatically.</p>
  </div>
</template>
