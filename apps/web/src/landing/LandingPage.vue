<script setup lang="ts">
import { computed, onMounted, reactive, ref, type ObjectDirective } from 'vue'
import AnalyticsPage from '@pos/core/pages/AnalyticsPage.vue'
import GroceryOrderPanel from '@pos/core/components/GroceryOrderPanel.vue'
import GroceryProductGrid from '@pos/core/components/GroceryProductGrid.vue'
import OrderPanel from '@pos/core/components/OrderPanel.vue'
import ProductGrid from '@pos/core/components/ProductGrid.vue'
import RestaurantOrderPanel from '@pos/core/components/RestaurantOrderPanel.vue'
import RestaurantProductGrid from '@pos/core/components/RestaurantProductGrid.vue'
import { usePosStore } from '@pos/core/stores/pos'
import type { BusinessMode } from '@pos/shared/index'
import WebglTiltImage from './WebglTiltImage.vue'
import ParticleField from './ParticleField.vue'
import CountUp from './CountUp.vue'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const isGrocery = computed(() => store.settings.businessMode === 'grocery')
const isRestaurant = computed(() => store.settings.businessMode === 'restaurant')

async function switchMode(mode: BusinessMode) {
  if (store.settings.businessMode === mode) return
  store.clearCart()
  await store.updateSettings({ ...store.settings, businessMode: mode })
}

const heroParticles = ref<InstanceType<typeof ParticleField> | null>(null)
function onHeroPointerMove(e: PointerEvent) {
  heroParticles.value?.setPointerFromEvent(e)
}
function onHeroPointerLeave() {
  heroParticles.value?.clearPointer()
}

const ctaParticles = ref<InstanceType<typeof ParticleField> | null>(null)
function onCtaPointerMove(e: PointerEvent) {
  ctaParticles.value?.setPointerFromEvent(e)
}
function onCtaPointerLeave() {
  ctaParticles.value?.clearPointer()
}

const registerTilt = reactive({ rx: 0, ry: 0, gx: 50, gy: 50, go: 0 })
function onRegisterTiltMove(e: PointerEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width
  const py = (e.clientY - rect.top) / rect.height
  const maxDeg = 4
  registerTilt.ry = (px - 0.5) * maxDeg * 2
  registerTilt.rx = -(py - 0.5) * maxDeg * 2
  registerTilt.gx = px * 100
  registerTilt.gy = py * 100
  registerTilt.go = 0.16
}
function onRegisterTiltLeave() {
  registerTilt.rx = 0
  registerTilt.ry = 0
  registerTilt.go = 0
}

const submitted = ref(false)
function handleSubmit(e: Event) {
  e.preventDefault()
  submitted.value = true
}

const vReveal: ObjectDirective<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
  },
}

const statsBar = ref<HTMLElement | null>(null)
const statsVisible = ref(false)
onMounted(() => {
  const el = statsBar.value
  if (!el) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        statsVisible.value = true
        observer.unobserve(el)
      }
    },
    { threshold: 0.3 },
  )
  observer.observe(el)
})

const stats = [
  { to: 3, label: 'Business modes' },
  { to: 10, prefix: '<', suffix: 's', label: 'Average checkout time' },
  { to: 100, suffix: '%', label: 'Offline capable' },
  { to: 3, label: 'Payment methods' },
]

const businessFitGroups = [
  {
    title: 'Coffee & café',
    dotColor: 'var(--accent)',
    items: ['Coffee shop', 'Bakery', 'Juice & smoothie bar', 'Dessert café'],
  },
  {
    title: 'Grocery & retail',
    dotColor: 'var(--success)',
    items: ['Convenience store', 'Specialty grocer', 'Bottle shop', 'Farmers market stall'],
  },
  {
    title: 'Restaurant & bar',
    dotColor: 'var(--warning)',
    items: ['Casual dining', 'Quick service', 'Food truck', 'Bar & pub'],
  },
]

const helpCards = [
  {
    title: 'Try the live register',
    desc: 'Switch business modes and ring up a real order — no signup needed to look around.',
    href: '#modes',
    cta: 'Open the demo',
  },
  {
    title: 'See how setup works',
    desc: 'Three steps from picking a business type to your first sale.',
    href: '#how',
    cta: 'Read the steps',
  },
  {
    title: 'Talk to us',
    desc: "Questions about early access or your specific business? We'll answer directly.",
    href: '#cta',
    cta: 'Get in touch',
  },
]

const faqs = [
  {
    q: 'Is Cole POS really free?',
    a: "Yes — Cole POS is free for the entire early access period. There's no trial countdown and no credit card required to get started.",
  },
  {
    q: 'Does Cole POS work without an internet connection?',
    a: 'Yes. Cole POS is local-first: the register keeps taking orders and charging customers while offline, then syncs automatically once you\'re back online.',
  },
  {
    q: 'What kind of business is Cole POS built for?',
    a: 'Cole POS adapts its layout and catalog structure to three business modes: Coffee Shop, Grocery Store, and Restaurant. Pick the one that matches your business and the register reconfigures automatically.',
  },
  {
    q: 'What hardware do I need to run Cole POS?',
    a: 'Any modern tablet, phone, or laptop with a web browser. No proprietary terminal or dedicated hardware is required to start selling.',
  },
  {
    q: 'What payment methods does Cole POS support?',
    a: 'Cash, card, and e-wallet payments are all supported at checkout, with change calculated automatically.',
  },
]
const openFaq = ref<number | null>(0)
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}
</script>

<template>
  <div class="landing">

    <!-- ── Nav ───────────────────────────────────────────────────────── -->
    <nav class="lp-nav">
      <a href="#" class="lp-nav-logo">
        <img src="/icon.png" alt="" width="28" height="28" style="border-radius:7px;" />
        Cole POS
      </a>
      <ul class="lp-nav-links">
        <li><a href="#modes">Modes</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#analytics">Analytics</a></li>
        <li><a href="#how">How it works</a></li>
      </ul>
      <div class="lp-nav-right">
        <a href="/app/auth" class="lp-nav-link-subtle">Sign in</a>
        <a href="#cta" class="lp-nav-cta">Get started</a>
      </div>
    </nav>

    <!-- ── Hero ──────────────────────────────────────────────────────── -->
    <div class="lp-hero-wrap" @pointermove="onHeroPointerMove" @pointerleave="onHeroPointerLeave">
      <span class="lp-blob lp-blob--1" aria-hidden="true"></span>
      <span class="lp-blob lp-blob--2" aria-hidden="true"></span>
      <div class="lp-particle-zone lp-particle-zone--hero" aria-hidden="true">
        <ParticleField ref="heroParticles" variant="light" :density="26" :repel-radius="0.5" :repel-strength="0.45" />
      </div>
      <div class="lp-hero">
        <div class="lp-hero-copy">
          <div class="lp-eyebrow hero-in" style="animation-delay:0ms">
            <span class="lp-eyebrow-dot"></span>
            Now in early access
          </div>
          <h1 class="lp-headline">
            <span class="lp-line hero-in" style="animation-delay:140ms">One app.</span><br>
            <span class="lp-line accent hero-in" style="animation-delay:220ms">Three businesses.</span>
          </h1>
          <p class="lp-sub hero-in" style="animation-delay:380ms">
            Cole POS becomes a different point-of-sale depending on whether you run a café, a grocery, or a restaurant.
            <strong>Checkout in under 10 seconds.</strong>
          </p>
          <div class="lp-actions hero-in" style="animation-delay:500ms">
            <a href="#cta" class="lp-btn-primary">
              Get started free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#modes" class="lp-btn-ghost">Try the real register</a>
          </div>
          <p class="lp-trust hero-in" style="animation-delay:580ms">
            No card required <span>·</span> Free during early access <span>·</span> Cancel anytime
          </p>
        </div>

        <div class="lp-hero-visual">
          <div class="lp-hero-image-frame hero-in--scale" style="animation-delay:420ms">
            <WebglTiltImage src="/hero.png" alt="Cole POS register screen on a tablet, showing the product grid and order summary" />
          </div>
          <div class="lp-hero-chip hero-in--pop" style="animation-delay:760ms">
            <div class="lp-chip-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div>
              <div class="lp-chip-value">&lt;10s</div>
              <div class="lp-chip-label">Average checkout</div>
            </div>
          </div>

          <!-- Floating feature cards: real UI components, not text bubbles -->
          <div class="lp-float-card lp-float-card--modes hero-in--pop" style="animation-delay:640ms">
            <div class="lp-float-bar">
              <span class="lp-float-dot" style="background:#ff5f57"></span>
              <span class="lp-float-dot" style="background:#febc2e"></span>
              <span class="lp-float-dot" style="background:#28c840"></span>
            </div>
            <div class="lp-float-body">
              <span class="lp-float-pill"><span class="lp-float-pill-dot" style="background:var(--accent)"></span>Coffee Shop</span>
              <span class="lp-float-pill"><span class="lp-float-pill-dot" style="background:var(--success)"></span>Grocery Store</span>
              <span class="lp-float-pill"><span class="lp-float-pill-dot" style="background:var(--warning)"></span>Restaurant</span>
            </div>
          </div>

          <div class="lp-float-card lp-float-card--analytics hero-in--pop" style="animation-delay:720ms">
            <div class="lp-float-bar">
              <span class="lp-float-dot" style="background:#ff5f57"></span>
              <span class="lp-float-dot" style="background:#febc2e"></span>
              <span class="lp-float-dot" style="background:#28c840"></span>
            </div>
            <div class="lp-float-body lp-float-body--analytics">
              <div class="lp-float-donut"></div>
              <div class="lp-float-chart">
                <span class="lp-float-bar-el" style="height:38%; background:var(--accent)"></span>
                <span class="lp-float-bar-el" style="height:62%; background:var(--accent)"></span>
                <span class="lp-float-bar-el" style="height:100%; background:var(--accent)"></span>
                <span class="lp-float-bar-el" style="height:48%; background:var(--accent)"></span>
                <span class="lp-float-bar-el" style="height:74%; background:var(--accent)"></span>
              </div>
            </div>
            <div class="lp-float-title">Live analytics</div>
          </div>

          <div class="lp-float-card lp-float-card--payments hero-in--pop" style="animation-delay:880ms">
            <div class="lp-float-body lp-float-body--payments">
              <span class="lp-float-pay-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
              </span>
              <span class="lp-float-pay-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </span>
              <span class="lp-float-pay-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </span>
            </div>
            <div class="lp-float-title lp-float-title--center">Flexible payments</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Stats bar ─────────────────────────────────────────────────── -->
    <div ref="statsBar" class="lp-stats-bar">
      <div class="lp-stats-inner">
        <div v-for="(stat, i) in stats" :key="stat.label" v-reveal="i * 100" class="lp-stat">
          <div class="lp-stat-value">
            <CountUp :to="stat.to" :prefix="stat.prefix" :suffix="stat.suffix" :start="statsVisible" :delay="i * 100" />
          </div>
          <div class="lp-stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- ── Business modes — live register demo ──────────────────────── -->
    <section id="modes" class="lp-section lp-section--surface">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Business Modes</p>
        <h2 v-reveal class="lp-title">Adapts to your industry.<br>This is the real register.</h2>
        <p v-reveal class="lp-subcopy">
          Switch modes below and watch the actual Cole POS register reconfigure — real catalog, real cart, real checkout dialog. Nothing here is a mockup.
        </p>

        <div v-reveal class="lp-mode-tabs">
          <button
            v-reveal="0"
            class="lp-mode-tab reveal--pop"
            :class="{ active: store.settings.businessMode === 'coffee-shop' }"
            type="button"
            @click="switchMode('coffee-shop')"
          >
            <span class="lp-tab-dot" style="background:var(--accent)"></span>
            Coffee Shop
          </button>
          <button
            v-reveal="80"
            class="lp-mode-tab reveal--pop"
            :class="{ active: isGrocery }"
            type="button"
            @click="switchMode('grocery')"
          >
            <span class="lp-tab-dot" style="background:var(--success)"></span>
            Grocery Store
          </button>
          <button
            v-reveal="160"
            class="lp-mode-tab reveal--pop"
            :class="{ active: isRestaurant }"
            type="button"
            @click="switchMode('restaurant')"
          >
            <span class="lp-tab-dot" style="background:var(--warning)"></span>
            Restaurant
          </button>
        </div>

        <div v-reveal class="lp-demo-wrap reveal--scale reveal--lift">
        <div
          class="lp-demo-window--tilt"
          :style="{
            transform: `perspective(1100px) rotateX(${registerTilt.rx}deg) rotateY(${registerTilt.ry}deg)`,
            '--glare-x': `${registerTilt.gx}%`,
            '--glare-y': `${registerTilt.gy}%`,
            '--glare-o': registerTilt.go,
          }"
          @pointermove="onRegisterTiltMove"
          @pointerleave="onRegisterTiltLeave"
        >
          <div class="app-demo-frame lp-demo-window__body lp-demo-window__body--register">
            <div class="register-layout">
              <RestaurantProductGrid v-if="isRestaurant" />
              <GroceryProductGrid v-else-if="isGrocery" />
              <ProductGrid v-else />
              <RestaurantOrderPanel v-if="isRestaurant" />
              <GroceryOrderPanel v-else-if="isGrocery" />
              <OrderPanel v-else />
            </div>
          </div>
          <div class="lp-demo-fade" aria-hidden="true"></div>
        </div>
        </div>
        <p v-reveal class="lp-demo-hint">Tap a product, then “Charge” to see the real payment dialog — cash, card, or e-wallet.</p>
      </div>
    </section>

    <!-- ── Trust strip ───────────────────────────────────────────────── -->
    <div v-reveal class="lp-trust-strip">
      <div class="lp-trust-inner">
        <span class="lp-trust-label">In early access with</span>
        <div class="lp-trust-shops">
          <div class="lp-trust-shop"><span class="lp-trust-dot" style="background:var(--accent)"></span>Specialty coffee shops</div>
          <div class="lp-trust-shop"><span class="lp-trust-dot" style="background:var(--success)"></span>Independent grocers</div>
          <div class="lp-trust-shop"><span class="lp-trust-dot" style="background:var(--warning)"></span>Family restaurants</div>
        </div>
      </div>
    </div>

    <!-- ── Features bento ────────────────────────────────────────────── -->
    <section id="features" class="lp-section">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Features</p>
        <h2 v-reveal class="lp-title">Everything you need.<br>Nothing you don't.</h2>
        <p v-reveal class="lp-subcopy">Every feature earns its place. No bloated menus, no unnecessary steps.</p>

        <div class="lp-bento-grid">
          <div v-reveal="0" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
            <div class="lp-bento-title">Fast checkout</div>
            <p class="lp-bento-desc">One-tap products, instant totals. Ring up an order in under 10 seconds.</p>
          </div>
          <div v-reveal="70" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg></div>
            <div class="lp-bento-title">Works offline</div>
            <p class="lp-bento-desc">Local-first. Keeps running without internet and syncs when back online.</p>
          </div>
          <div v-reveal="140" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
            <div class="lp-bento-title">Smart inventory</div>
            <p class="lp-bento-desc">Track by unit or weight. Low-stock alerts before you run out.</p>
          </div>
          <div v-reveal="210" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
            <div class="lp-bento-title">Live analytics</div>
            <p class="lp-bento-desc">Revenue, orders, and top products — on one screen, always current.</p>
          </div>
          <div v-reveal="280" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="lp-bento-title">Multi-role access</div>
            <p class="lp-bento-desc">Admin, Manager, Cashier — staff see exactly what they need.</p>
          </div>
          <div v-reveal="350" class="lp-bento-cell reveal--scale">
            <div class="lp-bento-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
            <div class="lp-bento-title">Flexible payments</div>
            <p class="lp-bento-desc">Cash, card, and e-wallet. Change calculated automatically.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Analytics — live component ────────────────────────────────── -->
    <section id="analytics" class="lp-section lp-section--surface">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Analytics</p>
        <h2 v-reveal class="lp-title">Know your numbers. Every day.</h2>
        <p v-reveal class="lp-subcopy">
          This is the real Analytics page, fed by the orders flowing through the register above. Revenue, payment mix, top products, and hourly trends — on one screen, updated live.
        </p>

        <div v-reveal class="lp-demo-wrap reveal--scale reveal--lift">
          <div class="lp-demo-window--analytics">
            <div class="app-demo-frame lp-demo-window__body lp-demo-window__body--analytics">
              <AnalyticsPage />
            </div>
            <div class="lp-demo-fade" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ──────────────────────────────────────────────── -->
    <section id="how" class="lp-section">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">How it works</p>
        <h2 v-reveal class="lp-title">Up and running<br>in minutes.</h2>

        <div class="lp-steps-grid">
          <div v-reveal="0" class="lp-step-card reveal--scale">
            <span class="lp-step-ordinal">01</span>
            <div class="lp-step-preview">
              <div class="lp-step-preview__bar">
                <span class="lp-step-dot" style="background:#ff5f57"></span>
                <span class="lp-step-dot" style="background:#febc2e"></span>
                <span class="lp-step-dot" style="background:#28c840"></span>
              </div>
              <div class="lp-step-preview__body lp-step-preview__body--modes">
                <span class="lp-mode-chip lp-mode-chip--active"><span class="lp-tab-dot" style="background:var(--accent)"></span>Coffee Shop</span>
                <span class="lp-mode-chip"><span class="lp-tab-dot" style="background:var(--success)"></span>Grocery Store</span>
                <span class="lp-mode-chip"><span class="lp-tab-dot" style="background:var(--warning)"></span>Restaurant</span>
              </div>
            </div>
            <h3 class="lp-step-title">Pick your business type</h3>
            <p class="lp-step-desc">Choose Coffee Shop, Grocery, or Restaurant. Cole POS loads the right layout, catalog structure, and checkout flow automatically.</p>
          </div>

          <svg class="lp-step-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

          <div v-reveal="150" class="lp-step-card reveal--scale">
            <span class="lp-step-ordinal">02</span>
            <div class="lp-step-preview">
              <div class="lp-step-preview__bar">
                <span class="lp-step-dot" style="background:#ff5f57"></span>
                <span class="lp-step-dot" style="background:#febc2e"></span>
                <span class="lp-step-dot" style="background:#28c840"></span>
              </div>
              <div class="lp-step-preview__body lp-step-preview__body--table">
                <div class="lp-step-table__head">
                  <span>Name</span><span>Price</span><span>Stock</span><span>SKU</span>
                </div>
                <div class="lp-step-table__row">
                  <span>Latte</span><span>$4.50</span><span>18</span><span>CF-014</span>
                </div>
              </div>
            </div>
            <h3 class="lp-step-title">Add your products</h3>
            <p class="lp-step-desc">Import a CSV or build your catalog item by item. Set prices, categories, tax rates, and stock levels.</p>
          </div>

          <svg class="lp-step-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

          <div v-reveal="300" class="lp-step-card reveal--scale">
            <span class="lp-step-ordinal">03</span>
            <div class="lp-step-preview">
              <div class="lp-step-preview__bar">
                <span class="lp-step-dot" style="background:#ff5f57"></span>
                <span class="lp-step-dot" style="background:#febc2e"></span>
                <span class="lp-step-dot" style="background:#28c840"></span>
              </div>
              <div class="lp-step-preview__body lp-step-preview__body--receipt">
                <div class="lp-step-receipt__row"><span>Latte ×2</span><span>$9.00</span></div>
                <div class="lp-step-receipt__row"><span>Muffin</span><span>$4.50</span></div>
                <div class="lp-step-receipt__row"><span>Tax</span><span>$2.00</span></div>
                <div class="lp-step-receipt__total"><span>Total</span><span>$15.50</span></div>
              </div>
            </div>
            <h3 class="lp-step-title">Start selling</h3>
            <p class="lp-step-desc">Open the register, tap products, select payment, and charge. Every order is tracked and analytics update in real time.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Business fit ─────────────────────────────────────────────── -->
    <section id="business-types" class="lp-section lp-section--surface">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Business types</p>
        <h2 v-reveal class="lp-title">Fits just right for your business.</h2>
        <p v-reveal class="lp-subcopy">
          Every Cole POS mode is built around how a specific kind of business actually runs its counter.
        </p>

        <div class="lp-fit-grid">
          <div v-for="(group, gi) in businessFitGroups" :key="group.title" v-reveal="gi * 90" class="lp-fit-card reveal--scale">
            <div class="lp-fit-card__head">
              <span class="lp-tab-dot" :style="{ background: group.dotColor }"></span>
              <h3 class="lp-fit-card__title">{{ group.title }}</h3>
            </div>
            <ul class="lp-fit-list">
              <li v-for="item in group.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Help & support ───────────────────────────────────────────── -->
    <section id="help" class="lp-section">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Get the help you need</p>
        <h2 v-reveal class="lp-title">You're never figuring this out alone.</h2>

        <div class="lp-help-grid">
          <a v-for="(card, hi) in helpCards" :key="card.title" v-reveal="hi * 90" :href="card.href" class="lp-help-card reveal--scale">
            <h3 class="lp-help-card__title">{{ card.title }}</h3>
            <p class="lp-help-card__desc">{{ card.desc }}</p>
            <span class="lp-help-card__cta">
              {{ card.cta }}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </a>
        </div>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────── -->
    <section id="faq" class="lp-section lp-section--surface">
      <div class="lp-container lp-container--narrow">
        <p v-reveal class="lp-eyebrow-label">FAQ</p>
        <h2 v-reveal class="lp-title">Cole POS Q&amp;A.</h2>

        <div class="lp-faq-list">
          <div v-for="(item, fi) in faqs" :key="item.q" v-reveal="fi * 60" class="lp-faq-item">
            <button
              class="lp-faq-question"
              type="button"
              :aria-expanded="openFaq === fi"
              @click="toggleFaq(fi)"
            >
              <span>{{ item.q }}</span>
              <svg class="lp-faq-chevron" :class="{ 'lp-faq-chevron--open': openFaq === fi }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="lp-faq-answer" :class="{ 'lp-faq-answer--open': openFaq === fi }">
              <p>{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ───────────────────────────────────────────────────────── -->
    <section id="cta" class="lp-cta" @pointermove="onCtaPointerMove" @pointerleave="onCtaPointerLeave">
      <span class="lp-blob lp-blob--cta" aria-hidden="true"></span>
      <div v-reveal class="lp-particle-zone lp-particle-zone--full" aria-hidden="true">
        <ParticleField ref="ctaParticles" variant="dark" :density="55" :repel-radius="0.45" :repel-strength="0.35" />
      </div>
      <div class="lp-container lp-cta-inner">
        <p v-reveal="0" class="lp-eyebrow-label lp-eyebrow-label--cta">Early access</p>
        <h2 v-reveal="0" class="lp-cta-title">Ready to open your store?</h2>
        <p v-reveal="0" class="lp-cta-stat">Join the waitlist — <strong>checkout in under 10 seconds</strong>, free during early access.</p>

        <form v-if="!submitted" v-reveal="140" class="lp-email-form" @submit="handleSubmit">
          <input class="lp-email-input" type="email" placeholder="your@email.com" required autocomplete="email" />
          <button type="submit" class="lp-btn-accent">Request access</button>
        </form>
        <p v-else class="lp-form-thanks">✓ You're on the list — we'll be in touch soon.</p>

        <template v-if="!submitted">
          <p v-reveal="260" class="lp-cta-reassure">We'll only reach out when your spot is ready — no newsletters, no spam.</p>
          <p v-reveal="260" class="lp-cta-secondary">Not ready to commit? <a href="#modes">Try the live register</a> first.</p>
        </template>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────── -->
    <footer class="lp-footer">
      <div class="lp-footer-top">
        <div class="lp-footer-brand">
          <span class="lp-footer-logo">
            <img src="/icon.png" alt="" width="24" height="24" style="border-radius:6px;" />
            Cole POS
          </span>
          <p class="lp-footer-tagline">One app. Three businesses. Free during early access.</p>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Product</p>
          <a href="#modes">Business modes</a>
          <a href="#features">Features</a>
          <a href="#analytics">Analytics</a>
          <a href="#how">How it works</a>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Business types</p>
          <a href="#business-types">Coffee &amp; café</a>
          <a href="#business-types">Grocery &amp; retail</a>
          <a href="#business-types">Restaurant &amp; bar</a>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Resources</p>
          <a href="#help">Get help</a>
          <a href="#faq">FAQ</a>
          <a href="/app/auth">Sign in</a>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Get started</p>
          <a href="#cta">Request access</a>
          <a href="#modes">Try the live register</a>
        </div>
      </div>
      <div class="lp-footer-bottom">
        <span class="lp-footer-copy">© 2026 Cole POS. All rights reserved.</span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* Marketing brand tokens — scoped to .landing (not :root) so the
   Teleport-to-body PaymentSheet/ProductSheet dialogs aren't affected.
   See landing.css for the full rationale. */
.landing {
  --accent: #404040;
  --accent-pressed: #262626;
  --accent-light: rgba(64, 64, 64, 0.08);
  --accent-border: rgba(64, 64, 64, 0.18);
  --marketing-dark: #14181d;
  --bg-base: #f4f6f8;
  --bg-surface: #ffffff;
  --bg-elevated: #eceff2;
  --fill: rgba(15, 23, 32, 0.05);
  --text-primary: #12161b;
  --text-secondary: #5b6470;
  --text-tertiary: #8b94a0;
  --separator: rgba(15, 23, 32, 0.08);
  --separator-strong: rgba(15, 23, 32, 0.14);
}

/* ── Reveal ──────────────────────────────────────────────────────────── */
.reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.65s var(--ease-out), transform 0.65s var(--ease-out); }
.reveal-visible { opacity: 1; transform: none; }
.reveal--scale { transform: scale(0.96); transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out), box-shadow 0.7s var(--ease-out); }
.reveal--scale.reveal-visible { transform: scale(1); }
.reveal--lift { box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.reveal--lift.reveal-visible { box-shadow: 0 20px 60px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05); }
.reveal--pop { transform: scale(0.85); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.reveal--pop.reveal-visible { transform: scale(1); }

/* ── Hero load-in (runs once on mount, never scroll-triggered) ────────── */
@keyframes heroRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes heroScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes heroPop { 0% { opacity: 0; transform: scale(0.7); } 65% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
.hero-in { opacity: 0; animation: heroRise 0.7s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
.hero-in--scale { opacity: 0; animation: heroScaleIn 0.8s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
.hero-in--pop { opacity: 0; animation: heroPop 0.6s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
.lp-line { display: inline-block; }

/* ── Nav ─────────────────────────────────────────────────────────────── */
.lp-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 56px;
  background: rgba(244,246,248,0.88);
  backdrop-filter: saturate(160%) blur(20px);
  border-bottom: 1px solid var(--separator);
}
.lp-nav-logo { display: flex; align-items: center; gap: 9px; font-size: 16px; font-weight: 700; letter-spacing: -0.025em; }
.lp-nav-links { display: flex; align-items: center; gap: 28px; list-style: none; margin: 0; padding: 0; }
.lp-nav-links a { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
.lp-nav-links a:hover { color: var(--text-primary); }
.lp-nav-right { display: flex; align-items: center; gap: 12px; }
.lp-nav-link-subtle { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
.lp-nav-link-subtle:hover { color: var(--text-primary); }
.lp-nav-cta {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 600;
  border-radius: 980px; transition: opacity 150ms;
}
.lp-nav-cta:hover { opacity: 0.82; }

/* ── Decorative blobs ──────────────────────────────────────────────── */
.lp-blob { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; z-index: 0; }
.lp-blob--1 { top: -140px; right: -100px; width: 460px; height: 460px; background: radial-gradient(circle, rgba(64,64,64,0.16), transparent 70%); }
.lp-blob--2 { bottom: -120px; left: -80px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(64,64,64,0.10), transparent 70%); }
.lp-blob--cta { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 640px; height: 640px; background: radial-gradient(circle, rgba(255,255,255,0.07), transparent 70%); }

.lp-particle-zone { position: absolute; z-index: 0; pointer-events: none; }
.lp-particle-zone.reveal { transform: none; }
.lp-particle-zone--hero { top: 0; right: 0; bottom: 0; width: 58%; }
.lp-particle-zone--full { inset: 0; }

/* ── Hero ────────────────────────────────────────────────────────────── */
.lp-hero-wrap { position: relative; overflow: hidden; background: var(--bg-base); border-bottom: 1px solid var(--separator); }
.lp-hero {
  position: relative; z-index: 1;
  padding: 80px 60px 0;
  display: grid; grid-template-columns: 0.9fr 1.3fr; gap: 48px; align-items: center;
  max-width: 1280px; margin: 0 auto; min-height: calc(100vh - 56px);
}
.lp-hero-copy { padding-bottom: 80px; }
.lp-eyebrow {
  display: inline-flex; align-items: center; gap: 7px; padding: 5px 14px;
  background: var(--accent-light); border: 1px solid var(--accent-border);
  border-radius: 980px; font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 28px;
}
.lp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: lp-blink 2.2s ease-in-out infinite; }
@keyframes lp-blink { 0%, 100% { opacity: 1; } 55% { opacity: 0.25; } }
.lp-headline { font-size: clamp(2.8rem, 5vw, 4.5rem); font-weight: 800; line-height: 1.02; letter-spacing: -0.04em; margin: 0 0 22px; }
.lp-headline .accent { color: var(--accent); }
.lp-sub { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.65; margin: 0 0 36px; max-width: 420px; }
.lp-sub strong { color: var(--text-primary); font-weight: 600; }
.lp-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
.lp-btn-primary {
  display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px;
  background: var(--accent); color: #fff; font-size: 15px; font-weight: 700;
  border-radius: 12px; letter-spacing: -0.01em; transition: opacity 150ms, transform 250ms, box-shadow 250ms;
  box-shadow: 0 10px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08);
}
.lp-btn-primary:hover { opacity: 0.86; transform: translateY(-1px); }
.lp-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px;
  background: var(--bg-surface); color: var(--text-primary); font-size: 15px; font-weight: 600;
  border-radius: 12px; border: 1px solid var(--separator-strong); transition: background 150ms;
}
.lp-btn-ghost:hover { background: var(--bg-elevated); }
.lp-trust { font-size: 12.5px; color: var(--text-tertiary); }
.lp-trust span { margin: 0 6px; }

.lp-hero-visual { position: relative; align-self: center; display: flex; align-items: center; margin-right: -40px; }
.lp-hero-image-frame {
  width: 100%; aspect-ratio: 16/9; position: relative;
  filter: drop-shadow(0 32px 70px rgba(0,0,0,0.16)) drop-shadow(0 8px 20px rgba(0,0,0,0.07));
}
.lp-hero-chip {
  position: absolute; bottom: 2%; left: -18px; background: var(--bg-surface);
  border: 1px solid var(--separator); border-radius: 16px; padding: 11px 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.05);
  display: flex; align-items: center; gap: 10px; z-index: 2;
}
.lp-chip-icon { width: 30px; height: 30px; border-radius: 9px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.lp-chip-value { font-size: 16px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.lp-chip-label { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; }

/* ── Floating feature cards (mini real-component mockups, not text bubbles) ── */
.lp-float-card {
  position: absolute; z-index: 2; width: 178px; background: var(--bg-surface);
  border: 1px solid var(--separator); border-radius: 15px; overflow: hidden;
  box-shadow: 0 18px 48px rgba(0,0,0,0.13), 0 5px 12px rgba(0,0,0,0.05);
}
.lp-float-bar { display: flex; align-items: center; gap: 5px; padding: 7px 10px; background: #e4e7ea; }
.lp-float-dot { width: 7px; height: 7px; border-radius: 50%; }
.lp-float-body { padding: 10px 11px 12px; display: flex; flex-direction: column; gap: 6px; }
.lp-float-pill {
  display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px;
  background: var(--bg-base); border: 1px solid var(--separator); border-radius: 980px;
  font-size: 11.5px; font-weight: 600; color: var(--text-primary);
}
.lp-float-pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.lp-float-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); padding: 0 11px 11px; }
.lp-float-title--center { text-align: center; }

.lp-float-card--modes { top: 2%; right: -22px; }

.lp-float-card--analytics { top: 32%; left: -26px; }
.lp-float-body--analytics { flex-direction: row; align-items: flex-end; gap: 10px; padding: 13px 12px 6px; }
.lp-float-donut {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--accent) 0% 40%, var(--success) 40% 70%, var(--warning) 70% 100%);
}
.lp-float-chart { display: flex; align-items: flex-end; gap: 4px; height: 36px; flex: 1; }
.lp-float-bar-el { flex: 1; border-radius: 3px 3px 0 0; min-height: 4px; }

.lp-float-card--payments { bottom: 16%; right: -14px; width: 150px; }
.lp-float-body--payments { flex-direction: row; justify-content: center; gap: 8px; padding: 13px 12px 10px; }
.lp-float-pay-icon {
  width: 32px; height: 32px; border-radius: 10px; background: var(--accent-light);
  display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0;
}

/* ── Stats bar ───────────────────────────────────────────────────────── */
.lp-stats-bar { padding: 52px 40px; border-top: 1px solid var(--separator); border-bottom: 1px solid var(--separator); }
.lp-stats-inner { max-width: 860px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center; }
.lp-stat { border-right: 1px solid var(--separator); }
.lp-stat:last-child { border-right: none; }
.lp-stat-value { font-size: 2.1rem; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 5px; }
.lp-stat-label { font-size: 13px; color: var(--text-secondary); }

/* ── Section chrome ────────────────────────────────────────────────── */
.lp-section, .lp-cta { scroll-margin-top: 56px; }
.lp-section { padding: 96px 40px; }
.lp-section--surface { background: var(--bg-surface); border-top: 1px solid var(--separator); border-bottom: 1px solid var(--separator); }
.lp-container { max-width: 1080px; margin: 0 auto; }
.lp-eyebrow-label {
  display: inline-flex; align-items: center; padding: 5px 13px;
  background: var(--accent-light); border: 1px solid var(--accent-border);
  border-radius: 980px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent); margin-bottom: 18px;
}
.lp-eyebrow-label--cta { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.55); }
.lp-title { font-size: clamp(1.9rem, 3.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.035em; line-height: 1.06; margin: 0 0 16px; }
.lp-subcopy { font-size: 1.0625rem; color: var(--text-secondary); max-width: 560px; line-height: 1.65; margin: 0 0 40px; }

/* ── Mode tabs + live demo window ─────────────────────────────────── */
.lp-mode-tabs { display: flex; gap: 8px; margin-bottom: 28px; border-bottom: 1px solid var(--separator); }
.lp-mode-tab {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
  border: none; background: none; font-family: var(--font-sans); font-size: 14px; font-weight: 600;
  color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 250ms, border-color 250ms;
}
.lp-mode-tab:hover { color: var(--text-primary); }
.lp-mode-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); }
.lp-tab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.lp-demo-wrap { border-radius: 18px; }

/* Grid-wave stagger for the live product cards once the demo window settles in */
.lp-demo-wrap :deep(.product-card) { opacity: 0; transform: translateY(14px) scale(0.97); transition: opacity 0.5s ease, transform 0.5s var(--ease-out); }
.lp-demo-wrap.reveal-visible :deep(.product-card) { opacity: 1; transform: none; }
.lp-demo-wrap :deep(.product-card:nth-child(1)) { transition-delay: 0.08s; }
.lp-demo-wrap :deep(.product-card:nth-child(2)) { transition-delay: 0.14s; }
.lp-demo-wrap :deep(.product-card:nth-child(3)) { transition-delay: 0.20s; }
.lp-demo-wrap :deep(.product-card:nth-child(4)) { transition-delay: 0.26s; }
.lp-demo-wrap :deep(.product-card:nth-child(5)) { transition-delay: 0.32s; }
.lp-demo-wrap :deep(.product-card:nth-child(6)) { transition-delay: 0.38s; }
.lp-demo-wrap :deep(.product-card:nth-child(7)) { transition-delay: 0.44s; }
.lp-demo-wrap :deep(.product-card:nth-child(8)) { transition-delay: 0.50s; }
.lp-demo-wrap :deep(.product-card:nth-child(n+9)) { transition-delay: 0.56s; }
.lp-demo-window--tilt {
  position: relative; transform-style: preserve-3d; will-change: transform;
  transition: transform 220ms ease-out; --glare-x: 50%; --glare-y: 50%; --glare-o: 0;
}
.lp-demo-window--tilt::after {
  content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(255,255,255,0.45), transparent 55%);
  opacity: var(--glare-o); transition: opacity 220ms ease-out;
}
.lp-demo-window__body { padding: 16px; max-height: 720px; overflow: auto; }
.lp-demo-window--analytics { position: relative; }
.lp-demo-window__body--analytics { height: 640px; overflow-y: auto; overflow-x: hidden; }
.lp-demo-window__body--register { height: 640px; overflow-y: auto; overflow-x: hidden; }
.lp-demo-fade {
  position: absolute; left: 0; right: 0; bottom: 0; height: 64px; z-index: 1;
  background: linear-gradient(to bottom, transparent, var(--bg-surface) 78%);
  pointer-events: none; border-radius: 0 0 18px 18px;
}

/* Tie chart entrance to "this is live data" instead of pure decoration */
.lp-demo-window--analytics :deep(.donut-chart) { opacity: 0; transform: scale(0.7); transition: opacity 0.6s ease 0.1s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s; }
.lp-demo-wrap.reveal-visible :deep(.donut-chart) { opacity: 1; transform: scale(1); }

.lp-demo-window--analytics :deep(.hbar-fill) { transform: scaleX(0); transform-origin: left; transition: transform 0.7s var(--ease-out); }
.lp-demo-wrap.reveal-visible :deep(.hbar-fill) { transform: scaleX(1); }
.lp-demo-window--analytics :deep(.hbar-row:nth-child(1) .hbar-fill) { transition-delay: 0.15s; }
.lp-demo-window--analytics :deep(.hbar-row:nth-child(2) .hbar-fill) { transition-delay: 0.22s; }
.lp-demo-window--analytics :deep(.hbar-row:nth-child(3) .hbar-fill) { transition-delay: 0.29s; }
.lp-demo-window--analytics :deep(.hbar-row:nth-child(4) .hbar-fill) { transition-delay: 0.36s; }
.lp-demo-window--analytics :deep(.hbar-row:nth-child(n+5) .hbar-fill) { transition-delay: 0.43s; }

.lp-demo-window--analytics :deep(.product-rank-row) { opacity: 0; transform: translateY(10px); transition: opacity 0.5s ease, transform 0.5s var(--ease-out); }
.lp-demo-wrap.reveal-visible :deep(.product-rank-row) { opacity: 1; transform: none; }
.lp-demo-window--analytics :deep(.product-rank-row:nth-child(1)) { transition-delay: 0.1s; }
.lp-demo-window--analytics :deep(.product-rank-row:nth-child(2)) { transition-delay: 0.17s; }
.lp-demo-window--analytics :deep(.product-rank-row:nth-child(3)) { transition-delay: 0.24s; }
.lp-demo-window--analytics :deep(.product-rank-row:nth-child(n+4)) { transition-delay: 0.31s; }
.lp-demo-window--analytics :deep(.rank-bar-fill) { transform: scaleX(0); transform-origin: left; transition: transform 0.6s var(--ease-out) 0.35s; }
.lp-demo-wrap.reveal-visible :deep(.rank-bar-fill) { transform: scaleX(1); }

.lp-demo-window--analytics :deep(.hour-bar) { transform: scaleY(0); transform-box: fill-box; transform-origin: bottom; transition: transform 0.7s var(--ease-out) 0.2s; }
.lp-demo-wrap.reveal-visible :deep(.hour-bar) { transform: scaleY(1); }
.lp-demo-hint { margin-top: 16px; font-size: 13px; color: var(--text-tertiary); text-align: center; }

/* The actual register components define their own layout/spacing via app.css
   (.register-layout, .surface-panel, .order-panel, etc.) — nothing to add here. */

/* ── Trust strip ───────────────────────────────────────────────────── */
.lp-trust-strip { background: var(--bg-elevated); border-top: 1px solid var(--separator); border-bottom: 1px solid var(--separator); padding: 32px 40px; }
.lp-trust-inner { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 40px; justify-content: center; flex-wrap: wrap; }
.lp-trust-label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); }
.lp-trust-shops { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
.lp-trust-shop { display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); }
.lp-trust-dot { width: 8px; height: 8px; border-radius: 50%; }

/* ── Bento features ────────────────────────────────────────────────── */
.lp-bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lp-bento-cell { background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 22px; padding: 28px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow 250ms; }
.lp-bento-cell:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04); }
.lp-bento-icon {
  width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--separator); background: var(--accent-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  opacity: 0; transform: scale(0.5) rotate(-12deg);
  transition: opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s;
}
.lp-bento-cell.reveal-visible .lp-bento-icon { opacity: 1; transform: none; }
.lp-bento-title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
.lp-bento-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; }

/* ── Steps ─────────────────────────────────────────────────────────── */
.lp-steps-grid { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 20px; align-items: start; }
.lp-step-arrow { align-self: center; margin-top: 60px; color: var(--separator-strong); flex-shrink: 0; }
.lp-step-card {
  position: relative; display: grid; gap: 16px; padding: 24px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 22px;
}
.lp-step-ordinal {
  position: absolute; top: 18px; right: 22px; z-index: 1;
  font-size: 13px; font-weight: 800; letter-spacing: 0.02em; color: var(--text-tertiary);
}
.lp-step-preview { background: var(--bg-base); border: 1px solid var(--separator); border-radius: 14px; overflow: hidden; }
.lp-step-preview__bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--separator); }
.lp-step-dot { width: 8px; height: 8px; border-radius: 50%; }
.lp-step-preview__body { padding: 14px; min-height: 88px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }

.lp-step-preview__body--modes { gap: 7px; }
.lp-mode-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 980px;
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary); width: fit-content;
}
.lp-mode-chip--active { color: var(--text-primary); border-color: var(--separator-strong); box-shadow: var(--shadow-sm); }

.lp-step-table__head, .lp-step-table__row { display: grid; grid-template-columns: 1.3fr 1fr 0.8fr 1fr; gap: 6px; }
.lp-step-table__head { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-tertiary); padding-bottom: 8px; border-bottom: 1px solid var(--separator); }
.lp-step-table__row { font-size: 13px; font-weight: 600; color: var(--text-primary); padding-top: 2px; }

.lp-step-receipt__row, .lp-step-receipt__total { display: flex; justify-content: space-between; font-size: 13px; }
.lp-step-receipt__row { color: var(--text-secondary); }
.lp-step-receipt__total { font-weight: 700; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--separator); }

.lp-step-title { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
.lp-step-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.65; margin: 0; }

/* ── Business fit ──────────────────────────────────────────────────── */
.lp-container--narrow { max-width: 720px; }
.lp-fit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lp-fit-card { background: var(--bg-base); border: 1px solid var(--separator); border-radius: 18px; padding: 24px; }
.lp-fit-card__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.lp-fit-card__title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
.lp-fit-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.lp-fit-list li { font-size: 14px; color: var(--text-secondary); padding-left: 16px; position: relative; }
.lp-fit-list li::before { content: ''; position: absolute; left: 0; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--text-tertiary); }

/* ── Help & support ────────────────────────────────────────────────── */
.lp-help-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lp-help-card {
  display: flex; flex-direction: column; gap: 10px; padding: 24px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 18px;
  transition: box-shadow 250ms, transform 250ms;
}
.lp-help-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04); transform: translateY(-2px); }
.lp-help-card__title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
.lp-help-card__desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; flex: 1; }
.lp-help-card__cta { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: var(--accent); }

/* ── FAQ ───────────────────────────────────────────────────────────── */
.lp-faq-list { display: flex; flex-direction: column; }
.lp-faq-item { border-bottom: 1px solid var(--separator); }
.lp-faq-item:first-child { border-top: 1px solid var(--separator); }
.lp-faq-question {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 2px; background: none; border: none; cursor: pointer;
  font-family: var(--font-sans); font-size: 16px; font-weight: 600; letter-spacing: -0.01em;
  color: var(--text-primary); text-align: left;
}
.lp-faq-chevron { flex-shrink: 0; color: var(--text-tertiary); transition: transform 250ms var(--ease-out); }
.lp-faq-chevron--open { transform: rotate(180deg); }
.lp-faq-answer { max-height: 0; overflow: hidden; transition: max-height 300ms var(--ease-out); }
.lp-faq-answer--open { max-height: 220px; }
.lp-faq-answer p { margin: 0 0 20px; padding: 0 2px; font-size: 14.5px; color: var(--text-secondary); line-height: 1.65; max-width: 600px; }

/* ── CTA ───────────────────────────────────────────────────────────── */
.lp-cta { position: relative; overflow: hidden; background: var(--marketing-dark); color: #fff; text-align: center; padding: 96px 40px; }
.lp-cta-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.lp-cta-title { font-size: clamp(1.9rem, 3.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; color: #fff; margin: 0 0 12px; }
.lp-cta-stat { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 32px; }
.lp-cta-stat strong { color: rgba(255,255,255,0.75); font-weight: 600; }
.lp-email-form { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.lp-email-input {
  padding: 14px 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
  border-radius: 12px; color: #fff; font-size: 15px; font-family: var(--font-sans); width: 300px; outline: none;
}
.lp-email-input::placeholder { color: rgba(255,255,255,0.3); }
.lp-email-input:focus { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); }
.lp-btn-accent { display: inline-flex; align-items: center; padding: 14px 28px; background: var(--accent); color: #fff; font-size: 15px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; }
.lp-btn-accent:hover { opacity: 0.86; }
.lp-cta-reassure { font-size: 12.5px; color: rgba(255,255,255,0.35); margin: 0 0 20px; }
.lp-cta-secondary { font-size: 14px; color: rgba(255,255,255,0.45); }
.lp-cta-secondary a { color: rgba(255,255,255,0.7); text-decoration: underline; text-underline-offset: 3px; }
.lp-cta-secondary a:hover { color: #fff; }
.lp-form-thanks { font-size: 16px; color: var(--success); margin: 0; }

/* ── Footer ────────────────────────────────────────────────────────── */
.lp-footer { padding: 64px 40px 32px; background: var(--marketing-dark); border-top: 1px solid rgba(255,255,255,0.06); }
.lp-footer-top {
  max-width: 1080px; margin: 0 auto 40px;
  display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr; gap: 32px;
}
.lp-footer-brand { display: flex; flex-direction: column; gap: 10px; }
.lp-footer-logo { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: -0.015em; color: rgba(255,255,255,0.8); }
.lp-footer-tagline { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; max-width: 220px; line-height: 1.55; }
.lp-footer-col { display: flex; flex-direction: column; gap: 12px; }
.lp-footer-col__title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin: 0 0 2px; }
.lp-footer-col a { font-size: 13.5px; color: rgba(255,255,255,0.55); }
.lp-footer-col a:hover { color: #fff; }
.lp-footer-bottom { max-width: 1080px; margin: 0 auto; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); }
.lp-footer-copy { font-size: 13px; color: rgba(255,255,255,0.3); }

/* ── Responsive ────────────────────────────────────────────────────── */
@media (max-width: 1020px) {
  .lp-hero { grid-template-columns: 1fr; padding: 64px 40px 0; min-height: auto; }
  .lp-hero-copy { padding-bottom: 0; }
  .lp-hero-visual { display: none; }
  .lp-bento-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-footer-top { grid-template-columns: 1.4fr 1fr 1fr; }
}
@media (max-width: 880px) {
  .lp-steps-grid { grid-template-columns: 1fr; gap: 24px; }
  .lp-step-arrow { display: none; }
  .lp-fit-grid, .lp-help-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .lp-nav { padding: 0 20px; }
  .lp-nav-links { display: none; }
  .lp-section { padding: 72px 20px; }
  .lp-hero { padding: 60px 20px 0; }
  .lp-stats-bar { padding: 44px 20px; }
  .lp-trust-strip { padding: 24px 20px; }
  .lp-bento-grid { grid-template-columns: 1fr; }
  .lp-stats-inner { grid-template-columns: repeat(2, 1fr); }
  .lp-footer { padding: 48px 20px 24px; }
  .lp-footer-top { grid-template-columns: 1fr 1fr; gap: 28px; text-align: left; }
  .lp-footer-bottom { text-align: center; }
}
@media (max-width: 480px) {
  .lp-stats-inner { grid-template-columns: 1fr 1fr; gap: 20px; }
  .lp-email-form { flex-direction: column; align-items: center; }
  .lp-email-input { width: 100%; max-width: 340px; }
  .lp-footer-top { grid-template-columns: 1fr; }
}
</style>
