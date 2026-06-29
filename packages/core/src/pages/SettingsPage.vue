<script setup lang="ts">
import {
  CircleCheckBig,
  ImagePlus,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Store,
  Trash2,
} from '@lucide/vue'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { businessModeLabel } from '@pos/shared/index'
import MenuRow from '@pos/core/components/MenuRow.vue'
import SettingsGroup from '@pos/core/components/SettingsGroup.vue'
import ToggleSwitch from '@pos/core/components/ToggleSwitch.vue'
import { usePosStore } from '@pos/core/stores/pos'
import type { Appearance, AppSettings, BusinessMode, Theme } from '@pos/shared/index'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

interface SettingsSection {
  id: string
  label: string
  icon: typeof Store
}

const baseSections: SettingsSection[] = [
  { id: 'business-profile', label: 'Business Profile', icon: Store },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'data-sync', label: 'Data & Sync', icon: RefreshCw },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const navSections = computed<SettingsSection[]>(() => baseSections)

const activeSectionId = ref(baseSections[0].id)
let sectionObserver: IntersectionObserver | null = null

function observeSections() {
  sectionObserver?.disconnect()
  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (visible.length === 0) {
        return
      }

      const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b))
      activeSectionId.value = topMost.target.id
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
  )

  for (const section of navSections.value) {
    const el = document.getElementById(section.id)
    if (el) {
      sectionObserver.observe(el)
    }
  }
}

onMounted(() => {
  observeSections()
})

watch(navSections, () => {
  observeSections()
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
})

function scrollToSection(id: string) {
  activeSectionId.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

const themeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'ember', label: 'Ember (coffee shop)' },
  { value: 'matcha', label: 'Matcha (tea house)' },
  { value: 'nocturne', label: 'Nocturne (late-night bar)' },
  { value: 'casa', label: 'Casa (mediterranean kitchen)' },
  { value: 'bloom', label: 'Bloom (patisserie & flowers)' },
  { value: 'reserve', label: 'Reserve (steakhouse & bar)' },
  { value: 'grove', label: 'Grove (juice & smoothie bar)' },
  { value: 'harbor', label: 'Harbor (seafood & market)' },
  { value: 'mono', label: 'Mono (studio store)' },
]

const businessNameDraft = ref('')
const businessImageError = ref('')

const businessNamePlaceholder = computed(() => `${businessModeLabel(store.settings.businessMode)} name`)

watch(
  () => store.settings.businessName,
  (value) => {
    businessNameDraft.value = value
  },
  { immediate: true },
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

</script>

<template>
  <div class="settings-page">
    <aside class="settings-nav">
      <p class="settings-nav__title">Settings</p>
      <button
        v-for="section in navSections"
        :key="section.id"
        class="settings-nav__item"
        :class="{ 'settings-nav__item--active': activeSectionId === section.id }"
        type="button"
        @click="scrollToSection(section.id)"
      >
        <component :is="section.icon" :size="16" />
        <span>{{ section.label }}</span>
      </button>
    </aside>

    <div class="settings-main">
      <div class="settings-main__header">
        <h1 class="settings-page__title">Settings</h1>
        <span class="settings-saved-badge">
          <CircleCheckBig :size="14" />
          <span>Changes are saved automatically</span>
        </span>
      </div>

      <div class="settings-columns">
        <SettingsGroup id="business-profile" class="settings-columns__main" label="Business Profile">
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

        <div class="settings-columns__side">
          <SettingsGroup id="general" label="General" description="Choose the type of business this register runs.">
            <MenuRow
              label="Business mode"
              :options="businessModeOptions"
              :model-value="store.settings.businessMode"
              ariaLabel="Business mode"
              @update:model-value="(value) => updateSetting('businessMode', value as BusinessMode)"
            />
          </SettingsGroup>

          <SettingsGroup id="data-sync" label="Data & Sync">
            <MenuRow
              label="Sync mode"
              :options="syncModeOptions"
              :model-value="store.settings.syncMode"
              ariaLabel="Sync mode"
              @update:model-value="(value) => updateSetting('syncMode', value as AppSettings['syncMode'])"
            />

            <template #footnote>
              Local-only keeps all data on this device. Switch to Online sync to back up sales and share your
              catalog across registers.
            </template>
          </SettingsGroup>
        </div>
      </div>

      <SettingsGroup id="appearance" class="settings-card--wide" label="Appearance & Behavior">
        <div class="settings-appearance-grid">
          <MenuRow
            label="Appearance"
            :options="appearanceOptions"
            :model-value="store.settings.appearance"
            ariaLabel="Appearance"
            @update:model-value="(value) => updateSetting('appearance', value as Appearance)"
          />

          <MenuRow
            label="Theme"
            :options="themeOptions"
            :model-value="store.settings.theme"
            ariaLabel="Theme"
            @update:model-value="(value) => updateSetting('theme', value as Theme)"
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
        </div>

        <template #footnote>
          Each theme swaps the accent and surface colors for a boutique look matched to a type of business. Ember,
          Matcha, Casa, Bloom, and Grove follow the Appearance setting above with their own Light and Dark
          variants; Nocturne, Reserve, Harbor, and Mono are each a single fixed mood regardless of Appearance.
        </template>
      </SettingsGroup>
    </div>
  </div>
</template>
