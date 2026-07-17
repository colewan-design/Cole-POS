<script setup lang="ts">
import type { Category } from '@pos/shared/index'
import { iconForCategory } from '@pos/web/storefront/icons'

const props = defineProps<{
  categories: Category[]
  countFor: (categoryId: string) => number
  selectedId: string | null
}>()

const emit = defineEmits<{ select: [categoryId: string | null] }>()

const tones = ['cat--blue', 'cat--aqua', 'cat--yellow', 'cat--green', 'cat--violet', 'cat--red']

function toggle(categoryId: string) {
  emit('select', props.selectedId === categoryId ? null : categoryId)
}
</script>

<template>
  <section id="categories" class="categories">
    <div class="categories__header">
      <h2 class="section-title">Popular Categories</h2>
      <button v-if="selectedId" type="button" class="categories__clear" @click="emit('select', null)">Show all</button>
    </div>
    <div class="categories__grid">
      <button
        v-for="(category, index) in categories"
        :key="category.id"
        type="button"
        class="cat-tile"
        :class="[tones[index % tones.length], { 'cat-tile--active': selectedId === category.id }]"
        @click="toggle(category.id)"
      >
        <span class="cat-tile__icon">
          <component :is="iconForCategory(category.name)" :size="26" />
        </span>
        <strong class="cat-tile__name">{{ category.name }}</strong>
        <span class="cat-tile__count">{{ countFor(category.id) }} Product{{ countFor(category.id) === 1 ? '' : 's' }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.categories {
  margin-top: var(--space-10);
}

.categories__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.section-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.categories__clear {
  border: none;
  background: none;
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.categories__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-4);
}

.cat-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
}

.cat-tile--active {
  border-color: var(--accent);
}

.cat-tile__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.55);
}

.cat-tile__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.cat-tile__count {
  font-size: 12px;
  color: var(--text-secondary);
}

.cat--blue {
  background: color-mix(in srgb, var(--tag-1-blue) 16%, var(--bg-elevated));
}
.cat--aqua {
  background: color-mix(in srgb, var(--tag-2-aqua) 16%, var(--bg-elevated));
}
.cat--yellow {
  background: color-mix(in srgb, var(--tag-3-yellow) 18%, var(--bg-elevated));
}
.cat--green {
  background: color-mix(in srgb, var(--tag-4-green) 14%, var(--bg-elevated));
}
.cat--violet {
  background: color-mix(in srgb, var(--tag-5-violet) 14%, var(--bg-elevated));
}
.cat--red {
  background: color-mix(in srgb, var(--tag-6-red) 14%, var(--bg-elevated));
}
</style>
