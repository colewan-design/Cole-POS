<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="workspace-page">
    <section class="workspace-hero">
      <div>
        <p class="workspace-hero__eyebrow">Workspace</p>
        <h1 class="workspace-hero__title">{{ title }}</h1>
        <p class="workspace-hero__copy">{{ description }}</p>
      </div>
      <div class="workspace-hero__badge">Coming online</div>
    </section>

    <section class="workspace-grid">
      <article class="workspace-card">
        <h2>Ready for rollout</h2>
        <p>This module now has routing and placement in the admin shell, so we can continue filling in workflows without changing the dashboard structure again.</p>
      </article>
      <article class="workspace-card">
        <h2>Suggested next step</h2>
        <p>We can turn this placeholder into a full management surface next, using the same chart, table, and metric patterns introduced in the dashboard.</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.workspace-page {
  display: grid;
  gap: var(--space-5);
}

.workspace-hero,
.workspace-card {
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.workspace-hero {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
  padding: var(--space-6);
}

.workspace-hero__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font: var(--type-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.workspace-hero__title {
  margin: 0;
  font: var(--type-title1);
}

.workspace-hero__copy {
  max-width: 54ch;
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
}

.workspace-hero__badge {
  min-height: 38px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--warning) 16%, transparent);
  color: var(--warning);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: var(--type-subhead);
  font-weight: 600;
  white-space: nowrap;
}

.workspace-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.workspace-card {
  padding: var(--space-5);
}

.workspace-card h2 {
  margin: 0 0 var(--space-2);
  font: var(--type-headline);
}

.workspace-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 720px) {
  .workspace-hero {
    flex-direction: column;
  }
}
</style>
