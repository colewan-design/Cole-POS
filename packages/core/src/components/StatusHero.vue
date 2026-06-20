<script setup lang="ts">
import { CloudOff, RefreshCw, Store } from '@lucide/vue'
import { computed } from 'vue'
import { usePosStore } from '@pos/core/stores/pos'
import { businessModeLabel } from '@pos/shared/index'

const store = usePosStore()

const syncLabel = computed(() =>
  store.settings.syncMode === 'local-only' ? 'Local-only mode' : 'Online sync enabled',
)

const businessLabel = computed(() =>
  store.settings.businessName.trim()
    || `${businessModeLabel(store.settings.businessMode)} profile`,
)
</script>

<template>
  <section class="status-hero">
    <div class="status-hero__headline">
      <p class="eyebrow">Offline-first POS</p>
      <h1>Built to keep selling even when the internet disappears.</h1>
      <p class="hero-copy">
        Shared Vue core, local persistence, and a checkout flow tuned for quick handoff at the counter.
      </p>
    </div>

    <div class="status-hero__stats">
      <article class="stat-card">
        <CloudOff :size="20" />
        <div>
          <p class="stat-card__label">Sync mode</p>
          <strong>{{ syncLabel }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <Store :size="20" />
        <div>
          <p class="stat-card__label">Business profile</p>
          <strong>{{ businessLabel }}</strong>
        </div>
      </article>
      <article class="stat-card">
        <RefreshCw :size="20" />
        <div>
          <p class="stat-card__label">Recent orders</p>
          <strong>{{ store.orders.length }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>
