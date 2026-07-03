<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type ObjectDirective } from 'vue'
import WebglTiltImage from './WebglTiltImage.vue'
import ParticleField from './ParticleField.vue'
import CountUp from './CountUp.vue'

const heroVariants = [
  { src: '/hero-devices.png', label: 'Perfect for coffee shops' },
  { src: '/hero-devices-grocery.png', label: 'Perfect for grocery stores' },
  { src: '/hero-devices-restaurant.png', label: 'Perfect for restaurants' },
]
const activeHero = ref(0)
let heroTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!prefersReducedMotion) {
    heroTimer = setInterval(() => {
      activeHero.value = (activeHero.value + 1) % heroVariants.length
    }, 4500)
  }
})
onBeforeUnmount(() => {
  if (heroTimer) clearInterval(heroTimer)
})

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
  { to: 4, label: 'Business modes in one app' },
  { to: 10, prefix: '<', suffix: 's', label: 'Average checkout time' },
  { to: 100, suffix: '%', label: 'Still works offline' },
  { to: 3, label: 'Payment methods built in' },
  { to: 24, suffix: '/7', label: 'Tech support, always on' },
]

const businessFitGroups = [
  {
    title: 'Coffee & café',
    dotColor: 'var(--accent)',
    items: ['Coffee shop', 'Bakery', 'Juice & smoothie bar', 'Dessert café'],
  },
  {
    title: 'Grocery & retail',
    dotColor: '#38bdf8',
    items: ['Convenience store', 'Specialty grocer', 'Bottle shop', 'Farmers market stall'],
  },
  {
    title: 'Restaurant & bar',
    dotColor: '#f59e0b',
    items: ['Casual dining', 'Quick service', 'Food truck', 'Bar & pub'],
  },
  {
    title: 'Nail & beauty',
    dotColor: '#ec4899',
    items: ['Nail salon', 'Manicure & pedicure', 'Spa & wellness', 'Beauty bar'],
  },
]

const featureBlocks = [
  {
    graphic: 'receipt',
    align: 'right',
    eyebrow: 'Checkout',
    title: 'Fast, one-tap checkout',
    desc: 'Ring up an order in under 10 seconds with one-tap products and instant totals — on any device, at any counter.',
    bullets: ['One-tap product grid', 'Automatic tax & totals', 'Works on any tablet or phone'],
  },
  {
    graphic: 'chart',
    align: 'left',
    eyebrow: 'Analytics',
    title: 'Live analytics, always current',
    desc: 'Revenue, orders, and top products update in real time — no stale exports, no end-of-day surprises.',
    bullets: ['Real-time revenue & order tracking', 'Top product breakdowns', 'No manual report pulling'],
  },
  {
    graphic: 'inventory',
    align: 'right',
    eyebrow: 'Inventory',
    title: 'Smart inventory tracking',
    desc: 'Track stock by unit or by weight, import your catalog in bulk, and get low-stock alerts before you run out.',
    bullets: ['Track by unit or by weight', 'Bulk import & export', 'Low-stock alerts'],
  },
  {
    graphic: 'roles',
    align: 'left',
    eyebrow: 'Access control',
    title: 'Role-based access for your whole team',
    desc: 'Admin, Manager, and Cashier roles keep every teammate focused on exactly what their job needs — nothing more.',
    bullets: ['Admin, Manager & Cashier roles', 'Permission-based screens', 'Safer, simpler onboarding'],
  },
]

const plans = [
  {
    name: 'Early Access',
    price: '$0',
    period: 'during early access',
    highlight: true,
    cta: 'Get started free',
    href: '/app',
    features: [
      'All 4 business modes',
      'Unlimited products & orders',
      'Offline-capable register',
      'Live analytics dashboard',
      'Admin, Manager & Cashier roles',
    ],
  },
  {
    name: 'Growth',
    price: '₱300',
    period: '/month',
    altPrice: 'or ₱7,000 one-time payment',
    highlight: false,
    cta: 'Coming soon',
    href: null,
    features: ['Everything in Early Access', 'Multi-store support', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'TBA',
    period: 'coming after early access',
    highlight: false,
    cta: 'Coming soon',
    href: null,
    features: ['Everything in Growth', 'Dedicated onboarding', 'Custom integrations'],
  },
]

const helpCards = [
  {
    title: 'Explore the real app',
    desc: 'Create a free account and see the actual register — not a mockup.',
    href: '/app',
    cta: 'Open Cole POS',
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
    a: "Yes — Cole POS is free for the entire early access period, with no trial countdown and no credit card required. After early access, the Growth plan is ₱300/month, or ₱7,000 as a one-time payment.",
  },
  {
    q: 'Does Cole POS work without an internet connection?',
    a: 'Yes. Cole POS is local-first: the register keeps taking orders and charging customers while offline, then syncs automatically once you\'re back online.',
  },
  {
    q: 'What kind of business is Cole POS built for?',
    a: 'Cole POS adapts its layout and catalog structure to four business modes: Coffee Shop, Grocery Store, Restaurant, and Nail Salon. Pick the one that matches your business and the register reconfigures automatically.',
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
        <li><a href="#business-types">Business types</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>
      <div class="lp-nav-right">
        <a href="/app/auth" class="lp-nav-link-subtle">Log in</a>
        <a href="/app/auth" class="lp-nav-cta">Sign up</a>
      </div>
    </nav>

    <!-- ── Hero (centered) ──────────────────────────────────────────── -->
    <div class="lp-hero-wrap" @pointermove="onHeroPointerMove" @pointerleave="onHeroPointerLeave">
      <span class="lp-blob lp-blob--1" aria-hidden="true"></span>
      <span class="lp-blob lp-blob--2" aria-hidden="true"></span>
      <div class="lp-particle-zone lp-particle-zone--hero" aria-hidden="true">
        <ParticleField ref="heroParticles" variant="light" :density="34" :repel-radius="0.5" :repel-strength="0.45" />
      </div>
      <div class="lp-hero">
        <div class="lp-hero-copy">
          <div class="lp-eyebrow hero-in" style="animation-delay:0ms">
            <span class="lp-eyebrow-dot"></span>
            Now in early access
          </div>
          <h1 class="lp-headline">
            <span class="lp-line hero-in" style="animation-delay:140ms">One app.</span><br>
            <span class="lp-line accent hero-in" style="animation-delay:220ms">Four businesses.</span>
          </h1>
          <p class="lp-sub hero-in" style="animation-delay:380ms">
            Cole POS becomes a different point-of-sale depending on whether you run a café, a grocery, a restaurant, or a nail salon.
            <strong>Checkout in under 10 seconds.</strong>
          </p>
          <div class="lp-actions hero-in" style="animation-delay:500ms">
            <a href="#pricing" class="lp-btn-primary">
              Get started free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="/app" class="lp-btn-ghost">Explore the app</a>
          </div>
          <p class="lp-trust hero-in" style="animation-delay:580ms">
            No card required <span>·</span> Free during early access <span>·</span> Cancel anytime
          </p>
        </div>

        <div class="lp-hero-visual">
          <span class="lp-hero-caption" aria-live="polite">{{ heroVariants[activeHero].label }}</span>
          <img
            v-for="(variant, vi) in heroVariants"
            :key="variant.src"
            class="lp-hero-devices"
            :class="{ 'lp-hero-devices--active': vi === activeHero }"
            :src="variant.src"
            :alt="`Cole POS shown on a laptop, tablet, and phone, displaying the product grid and order summary — ${variant.label.replace('Perfect for ', '')}`"
            width="1672"
            height="941"
          />
        </div>
      </div>
    </div>

    <!-- ── Quote / stats band ────────────────────────────────────────── -->
    <section ref="statsBar" class="lp-quote-band">
      <div class="lp-quote-band-inner">
        <div v-reveal class="lp-quote-block">
          <span class="lp-quote-glyph" aria-hidden="true">&ldquo;</span>
          <p class="lp-quote-text">Cole POS keeps your counter moving — built to work as hard as you do, online or off.</p>
        </div>
        <div class="lp-quote-stats">
          <div v-for="(stat, i) in stats" :key="stat.label" v-reveal="i * 100" class="lp-stat">
            <div class="lp-stat-value">
              <CountUp :to="stat.to" :prefix="stat.prefix" :suffix="stat.suffix" :start="statsVisible" :delay="i * 100" />
            </div>
            <div class="lp-stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Next-level experience ─────────────────────────────────────── -->
    <section id="experience" class="lp-section lp-section--surface">
      <div class="lp-container lp-experience-grid">
        <div v-reveal class="lp-experience-visual reveal--scale">
          <div class="lp-experience-frame">
            <WebglTiltImage src="/hero.png" alt="Cole POS register mid-order, showing the product grid and running total" />
          </div>
          <div class="lp-experience-chip">
            <span class="lp-tab-dot" style="background:var(--accent)"></span>
            Admin · Manager · Cashier roles
          </div>
        </div>

        <div class="lp-experience-text">
          <p v-reveal class="lp-eyebrow-label">About Cole POS</p>
          <h2 v-reveal class="lp-title">One register that adapts to your business.</h2>
          <p v-reveal class="lp-subcopy">
            Whatever role someone plays behind the counter, Cole POS gets out of their way — pick a business type once, and the layout, catalog, and checkout flow follow.
          </p>
          <div v-reveal class="lp-check-grid">
            <div class="lp-check-item">
              <span class="lp-check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </span>
              Fast checkout
            </div>
            <div class="lp-check-item">
              <span class="lp-check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              </span>
              Works offline
            </div>
            <div class="lp-check-item">
              <span class="lp-check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </span>
              Flexible payments
            </div>
            <div class="lp-check-item">
              <span class="lp-check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>
              </span>
              Smart inventory
            </div>
          </div>
          <a v-reveal href="/app" class="lp-experience-cta">
            <span class="lp-play-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
            See it live
          </a>
        </div>
      </div>
    </section>

    <!-- ── Business types ────────────────────────────────────────────── -->
    <section id="business-types" class="lp-section">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Business types</p>
        <h2 v-reveal class="lp-title">Built for a wide range of<br>businesses and industries.</h2>
        <p v-reveal class="lp-subcopy">
          Cole POS adapts its layout and catalog structure to match how your business actually runs its counter — pick a mode and everything reconfigures automatically.
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

    <!-- ── Features (alternating detail blocks) ─────────────────────── -->
    <section id="features" class="lp-section lp-section--surface">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Features</p>
        <h2 v-reveal class="lp-title">Full support for<br>everyday selling.</h2>
        <p v-reveal class="lp-subcopy">
          Every feature earns its place — no bloated menus, no unnecessary steps between a customer and their receipt.
        </p>
      </div>

      <div class="lp-container lp-feature-rows">
        <div
          v-for="(block, bi) in featureBlocks"
          :key="block.title"
          v-reveal="bi * 60"
          class="lp-feature-row"
          :class="{ 'lp-feature-row--reverse': block.align === 'left' }"
        >
          <div class="lp-feature-text">
            <p class="lp-feature-eyebrow">{{ block.eyebrow }}</p>
            <h3 class="lp-feature-title">{{ block.title }}</h3>
            <p class="lp-feature-desc">{{ block.desc }}</p>
            <ul class="lp-feature-bullets">
              <li v-for="b in block.bullets" :key="b">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                {{ b }}
              </li>
            </ul>
          </div>

          <div class="lp-feature-visual reveal--scale">
            <!-- Fast checkout: invoice / receipt -->
            <div v-if="block.graphic === 'receipt'" class="lp-invoice-stack">
              <div class="lp-invoice-card lp-invoice-card--back"></div>
              <div class="lp-invoice-card lp-invoice-card--front">
                <div class="lp-invoice-head">
                  <span>Order #482</span>
                  <span class="lp-invoice-badge">Paid</span>
                </div>
                <div class="lp-invoice-row"><span>Latte ×2</span><span>$9.00</span></div>
                <div class="lp-invoice-row"><span>Blueberry muffin</span><span>$4.50</span></div>
                <div class="lp-invoice-row"><span>Tax</span><span>$2.00</span></div>
                <div class="lp-invoice-total"><span>Total</span><span>$15.50</span></div>
              </div>
            </div>

            <!-- Analytics: line chart -->
            <div v-else-if="block.graphic === 'chart'" class="lp-chart-card">
              <div class="lp-chart-head">
                <div class="lp-chart-stat"><span class="lp-chart-stat__label">Orders today</span><span class="lp-chart-stat__value">106</span></div>
                <div class="lp-chart-stat"><span class="lp-chart-stat__label">Revenue today</span><span class="lp-chart-stat__value">$842</span></div>
              </div>
              <svg class="lp-chart-svg" viewBox="0 0 220 70" fill="none" preserveAspectRatio="none">
                <path d="M0,48 C18,44 28,18 48,24 C68,30 78,8 98,14 C118,20 128,46 148,34 C168,22 178,40 198,18 L220,26" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              </svg>
              <div class="lp-chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
            </div>

            <!-- Inventory: warm-accented chart -->
            <div v-else-if="block.graphic === 'inventory'" class="lp-chart-card lp-chart-card--warm">
              <div class="lp-chart-head">
                <div class="lp-chart-stat"><span class="lp-chart-stat__label">In stock</span><span class="lp-chart-stat__value lp-chart-stat__value--warm">1,204</span></div>
                <div class="lp-chart-stat"><span class="lp-chart-stat__label">Low-stock alerts</span><span class="lp-chart-stat__value lp-chart-stat__value--warm">6</span></div>
              </div>
              <svg class="lp-chart-svg" viewBox="0 0 220 70" fill="none" preserveAspectRatio="none">
                <path d="M0,20 C20,32 30,50 50,44 C70,38 80,12 100,20 C120,28 130,10 150,16 C170,22 180,40 200,30 L220,38" stroke="var(--accent-warm)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              </svg>
              <div class="lp-chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
            </div>

            <!-- Role management: team table -->
            <div v-else-if="block.graphic === 'roles'" class="lp-roles-card">
              <div class="lp-roles-head"><span>Teammate</span><span>Role</span></div>
              <div class="lp-roles-row">
                <span class="lp-roles-person"><span class="lp-roles-avatar" style="background:var(--accent)">JM</span>Jordan M.</span>
                <span class="lp-role-pill lp-role-pill--admin">Admin</span>
              </div>
              <div class="lp-roles-row">
                <span class="lp-roles-person"><span class="lp-roles-avatar" style="background:#f59e0b">AS</span>Ana S.</span>
                <span class="lp-role-pill lp-role-pill--manager">Manager</span>
              </div>
              <div class="lp-roles-row">
                <span class="lp-roles-person"><span class="lp-roles-avatar" style="background:#38bdf8">DK</span>Deo K.</span>
                <span class="lp-role-pill lp-role-pill--cashier">Cashier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ──────────────────────────────────────────────── -->
    <section id="how" class="lp-section">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">How it works</p>
        <h2 v-reveal class="lp-title">Up and running<br>in minutes.</h2>

        <div class="lp-how-track">
          <span class="lp-how-line" aria-hidden="true"></span>

          <div v-reveal="0" class="lp-how-step">
            <span class="lp-how-node">1</span>
            <span class="lp-how-watermark" aria-hidden="true">01</span>
            <div class="lp-how-visual lp-how-visual--modes">
              <span class="lp-mode-chip lp-mode-chip--active"><span class="lp-tab-dot" style="background:var(--accent)"></span>Coffee Shop</span>
              <span class="lp-mode-chip"><span class="lp-tab-dot" style="background:#38bdf8"></span>Grocery Store</span>
              <span class="lp-mode-chip"><span class="lp-tab-dot" style="background:#f59e0b"></span>Restaurant</span>
              <span class="lp-mode-chip"><span class="lp-tab-dot" style="background:#ec4899"></span>Nail Salon</span>
            </div>
            <h3 class="lp-step-title">Pick your business type</h3>
            <p class="lp-step-desc">Choose Coffee Shop, Grocery, Restaurant, or Nail Salon. Cole POS loads the right layout, catalog structure, and checkout flow automatically.</p>
          </div>

          <div v-reveal="150" class="lp-how-step">
            <span class="lp-how-node">2</span>
            <span class="lp-how-watermark" aria-hidden="true">02</span>
            <div class="lp-how-visual lp-how-visual--table">
              <div class="lp-step-table__head">
                <span>Name</span><span>Price</span><span>Stock</span><span>SKU</span>
              </div>
              <div class="lp-step-table__row">
                <span>Latte</span><span>$4.50</span><span>18</span><span>CF-014</span>
              </div>
              <div class="lp-how-import-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                42 products imported from CSV
              </div>
            </div>
            <h3 class="lp-step-title">Add your products</h3>
            <p class="lp-step-desc">Import a CSV or build your catalog item by item. Set prices, categories, tax rates, and stock levels.</p>
          </div>

          <div v-reveal="300" class="lp-how-step">
            <span class="lp-how-node">3</span>
            <span class="lp-how-watermark" aria-hidden="true">03</span>
            <div class="lp-how-visual lp-how-visual--receipt">
              <div class="lp-step-receipt__row"><span>Latte ×2</span><span>$9.00</span></div>
              <div class="lp-step-receipt__row"><span>Muffin</span><span>$4.50</span></div>
              <div class="lp-step-receipt__row"><span>Tax</span><span>$2.00</span></div>
              <div class="lp-step-receipt__total"><span>Total</span><span>$15.50</span></div>
            </div>
            <h3 class="lp-step-title">Start selling</h3>
            <p class="lp-step-desc">Open the register, tap products, select payment, and charge. Every order is tracked and analytics update in real time.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pricing ───────────────────────────────────────────────────── -->
    <section id="pricing" class="lp-section lp-section--dark">
      <div class="lp-container">
        <p v-reveal class="lp-eyebrow-label">Pricing</p>
        <h2 v-reveal class="lp-title">Plan for where<br>you're headed.</h2>
        <p v-reveal class="lp-subcopy">Free for everyone during early access. Paid tiers arrive later for teams that outgrow a single store.</p>

        <div class="lp-pricing-grid">
          <div
            v-for="(plan, pi) in plans"
            :key="plan.name"
            v-reveal="pi * 100"
            class="lp-pricing-card reveal--scale"
            :class="{ 'lp-pricing-card--highlight': plan.highlight }"
          >
            <span v-if="plan.highlight" class="lp-pricing-badge">Available now</span>
            <h3 class="lp-pricing-name">{{ plan.name }}</h3>
            <div class="lp-pricing-price">{{ plan.price }}<span class="lp-pricing-period">{{ plan.period }}</span></div>
            <p v-if="plan.altPrice" class="lp-pricing-alt">{{ plan.altPrice }}</p>
            <ul class="lp-pricing-features">
              <li v-for="f in plan.features" :key="f">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                {{ f }}
              </li>
            </ul>
            <a v-if="plan.href" :href="plan.href" class="lp-pricing-cta lp-pricing-cta--primary">{{ plan.cta }}</a>
            <span v-else class="lp-pricing-cta lp-pricing-cta--disabled">{{ plan.cta }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Founder note ──────────────────────────────────────────────── -->
    <section id="story" class="lp-section lp-section--surface">
      <div class="lp-container lp-story-grid">
        <div v-reveal class="lp-story-quote">
          <span class="lp-quote-glyph lp-quote-glyph--story" aria-hidden="true">&ldquo;</span>
          <p class="lp-story-text">I built Cole POS because every register I tried for my own shop either cost too much, broke without internet, or made me pay extra just to see which products actually sold. This is the tool I wanted to use.</p>
          <p class="lp-story-attribution">— The person behind Cole POS</p>
        </div>
        <div v-reveal="120" class="lp-story-values reveal--scale">
          <p class="lp-story-values__title">Why it's built this way</p>
          <ul class="lp-story-values__list">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              No forced subscription just to see your own sales data
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              Keeps ringing up orders even when Wi-Fi drops
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              One app that reconfigures for cafés, grocers, and restaurants
            </li>
          </ul>
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
          <p v-reveal="260" class="lp-cta-secondary">Not ready to commit? <a href="/app">Explore the app</a> first.</p>
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
          <p class="lp-footer-tagline">One app. Four businesses. Free during early access.</p>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Product</p>
          <a href="#business-types">Business types</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how">How it works</a>
        </div>

        <div class="lp-footer-col">
          <p class="lp-footer-col__title">Business types</p>
          <a href="#business-types">Coffee &amp; café</a>
          <a href="#business-types">Grocery &amp; retail</a>
          <a href="#business-types">Restaurant &amp; bar</a>
          <a href="#business-types">Nail &amp; beauty</a>
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
          <a href="/app">Explore the app</a>
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
  --accent-rgb: 37, 99, 235;
  --accent: #2563eb;
  --accent-pressed: #1d4ed8;
  --accent-light: rgba(var(--accent-rgb), 0.1);
  --accent-border: rgba(var(--accent-rgb), 0.24);
  --accent-warm: #f59e0b;
  --accent-warm-rgb: 245, 158, 11;
  --marketing-dark: #0b1220;
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
.reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.4s var(--ease-out), transform 0.4s var(--ease-out); }
.reveal-visible { opacity: 1; transform: none; }
.reveal--scale { transform: scale(0.97); transition: opacity 0.45s var(--ease-out), transform 0.45s var(--ease-out), box-shadow 0.45s var(--ease-out); }
.reveal--scale.reveal-visible { transform: scale(1); }

/* ── Hero load-in (runs once on mount, never scroll-triggered) ────────── */
@keyframes heroRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.hero-in { opacity: 0; animation: heroRise 0.7s cubic-bezier(0.16, 0.84, 0.44, 1) both; }
.lp-line { display: inline-block; }

/* ── Nav — permanently dark, matches the hero/CTA/footer panels ───────── */
.lp-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 60px;
  background: rgba(11,18,32,0.86);
  backdrop-filter: saturate(160%) blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.lp-nav-logo { display: flex; align-items: center; gap: 9px; font-size: 16px; font-weight: 700; letter-spacing: -0.025em; color: #fff; }
.lp-nav-links { display: flex; align-items: center; gap: 28px; list-style: none; margin: 0; padding: 0; }
.lp-nav-links a { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6); transition: color 150ms; }
.lp-nav-links a:hover { color: #fff; }
.lp-nav-right { display: flex; align-items: center; gap: 12px; }
.lp-nav-link-subtle { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6); transition: color 150ms; }
.lp-nav-link-subtle:hover { color: #fff; }
.lp-nav-cta {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 600;
  border: 1.5px solid var(--accent); border-radius: 980px; transition: background 150ms, border-color 150ms;
}
.lp-nav-cta:hover { background: var(--accent-pressed); border-color: var(--accent-pressed); }

/* ── Decorative blobs ──────────────────────────────────────────────── */
.lp-blob { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; z-index: 0; }
.lp-blob--1 { top: -140px; right: -100px; width: 460px; height: 460px; background: radial-gradient(circle, rgba(var(--accent-rgb),0.24), transparent 70%); }
.lp-blob--2 { bottom: -120px; left: -80px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(15,23,32,0.05), transparent 70%); }
.lp-blob--cta { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 640px; height: 640px; background: radial-gradient(circle, rgba(var(--accent-rgb),0.16), transparent 70%); }

.lp-particle-zone { position: absolute; z-index: 0; pointer-events: none; }
.lp-particle-zone.reveal { transform: none; }
.lp-particle-zone--hero { inset: 0; }
.lp-particle-zone--full { inset: 0; }

/* ── Hero (centered) ───────────────────────────────────────────────── */
.lp-hero-wrap { position: relative; overflow: hidden; background: var(--bg-surface); }
.lp-hero {
  position: relative; z-index: 1;
  padding: 96px 40px 80px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  max-width: 1180px; margin: 0 auto;
}
.lp-hero-copy { max-width: 720px; display: flex; flex-direction: column; align-items: center; }
.lp-eyebrow {
  display: inline-flex; align-items: center; gap: 7px; padding: 5px 14px;
  background: var(--accent-light); border: 1px solid var(--accent-border);
  border-radius: 980px; font-size: 13px; font-weight: 600; color: var(--accent-pressed); margin-bottom: 28px;
}
.lp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: lp-blink 2.2s ease-in-out infinite; }
@keyframes lp-blink { 0%, 100% { opacity: 1; } 55% { opacity: 0.25; } }
.lp-headline { font-size: clamp(2.6rem, 5vw, 4.2rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.04em; margin: 0 0 22px; color: var(--text-primary); }
.lp-headline .accent { color: var(--accent); }
.lp-sub { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.65; margin: 0 0 36px; max-width: 480px; }
.lp-sub strong { color: var(--text-primary); font-weight: 600; }
.lp-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 22px; }
.lp-btn-primary {
  display: inline-flex; align-items: center; gap: 9px; padding: 16px 30px;
  background: var(--accent); color: #fff; font-size: 16px; font-weight: 800;
  border-radius: 13px; letter-spacing: -0.01em; border: 1px solid transparent; transition: transform 220ms, box-shadow 220ms, background 150ms;
  box-shadow: 0 12px 28px rgba(var(--accent-rgb),0.35), 0 3px 8px rgba(var(--accent-rgb),0.2);
}
.lp-btn-primary:hover { background: var(--accent-pressed); transform: translateY(-2px); box-shadow: 0 16px 34px rgba(var(--accent-rgb),0.4), 0 4px 10px rgba(var(--accent-rgb),0.22); }
.lp-btn-ghost {
  display: inline-flex; align-items: center; gap: 9px; padding: 16px 30px;
  background: var(--fill); color: var(--text-primary); font-size: 16px; font-weight: 800;
  border-radius: 13px; letter-spacing: -0.01em; border: 1px solid var(--separator-strong); transition: background 150ms;
}
.lp-btn-ghost:hover { background: var(--bg-elevated); }
.lp-trust { font-size: 12.5px; color: var(--text-tertiary); }
.lp-trust span { margin: 0 6px; }

.lp-hero-visual { position: relative; width: 100%; max-width: 1040px; margin: 56px auto 0; aspect-ratio: 1672 / 941; }
.lp-hero-devices {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
  opacity: 0; transition: opacity 0.9s ease;
}
.lp-hero-devices--active { opacity: 1; }
.lp-hero-caption {
  position: absolute; top: -18px; left: 50%; transform: translate(-50%, -100%); z-index: 2;
  display: inline-flex; align-items: center; padding: 6px 16px;
  background: var(--accent-light); border: 1px solid var(--accent-border); border-radius: 980px;
  font-size: 12.5px; font-weight: 600; color: var(--accent-pressed); white-space: nowrap;
}

/* ── Quote / stats band (single blue row) ──────────────────────────── */
.lp-quote-band { position: relative; background: linear-gradient(135deg, var(--accent-pressed), var(--accent)); padding: 56px 40px; overflow: hidden; }
.lp-quote-band-inner {
  position: relative; z-index: 1; max-width: 1180px; margin: 0 auto;
  display: grid; grid-template-columns: 0.85fr 1.5fr; gap: 40px; align-items: center;
}
.lp-quote-block { display: flex; flex-direction: column; }
.lp-quote-glyph { font-family: Georgia, serif; font-size: 3.4rem; line-height: 1; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.lp-quote-text { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.015em; line-height: 1.4; color: #fff; margin: 0; }
.lp-quote-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
.lp-stat { border-right: 1px solid rgba(255,255,255,0.24); padding-right: 10px; }
.lp-stat:last-child { border-right: none; }
.lp-stat-value { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 6px; color: #fff; }
.lp-stat-label { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.75); line-height: 1.4; }

/* ── Section chrome ────────────────────────────────────────────────── */
.lp-section { scroll-margin-top: 60px; padding: 96px 40px; }
.lp-section--surface { background: var(--bg-surface); border-top: 1px solid var(--separator); border-bottom: 1px solid var(--separator); }
.lp-section--dark { background: var(--marketing-dark); }
.lp-section--dark .lp-title { color: #fff; }
.lp-section--dark .lp-subcopy { color: rgba(255,255,255,0.55); }
.lp-section--dark .lp-eyebrow-label { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.75); }
.lp-container { max-width: 1080px; margin: 0 auto; }
.lp-container--narrow { max-width: 720px; }

.lp-eyebrow-label {
  display: inline-flex; align-items: center; padding: 5px 13px;
  background: var(--accent-light); border: 1px solid var(--accent-border);
  border-radius: 980px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent-pressed); margin-bottom: 18px;
}
.lp-eyebrow-label--cta { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.55); }
.lp-title { font-size: clamp(1.9rem, 3.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.035em; line-height: 1.06; margin: 0 0 16px; color: var(--text-primary); }
.lp-subcopy { font-size: 1.0625rem; color: var(--text-secondary); max-width: 560px; line-height: 1.65; margin: 0 0 40px; }

/* ── Next-level experience split ────────────────────────────────────── */
.lp-experience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.lp-experience-visual { position: relative; }
.lp-experience-frame {
  aspect-ratio: 4/3; border-radius: 22px; overflow: hidden;
  border: 1px solid var(--separator); box-shadow: 0 24px 50px rgba(15,23,32,0.14), 0 6px 16px rgba(15,23,32,0.06);
}
.lp-experience-chip {
  position: absolute; bottom: -18px; right: 18px; display: inline-flex; align-items: center; gap: 8px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 980px; padding: 9px 16px;
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary);
  box-shadow: 0 14px 30px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);
}
.lp-experience-text .lp-eyebrow-label { margin-bottom: 18px; }
.lp-experience-text .lp-title { margin-bottom: 16px; }
.lp-experience-text .lp-subcopy { margin-bottom: 28px; max-width: none; }
.lp-check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
.lp-check-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  background: var(--bg-base); border: 1px solid var(--separator); border-radius: 12px;
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.lp-check-icon { flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; background: var(--accent-light); color: var(--accent-pressed); display: flex; align-items: center; justify-content: center; }
.lp-experience-cta {
  display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: var(--accent-pressed);
}
.lp-play-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
  border-radius: 50%; background: var(--accent); color: #fff;
}

/* ── Mode chips (used inside the "how it works" step previews) ────────── */
.lp-mode-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 980px;
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary); width: fit-content;
}
.lp-mode-chip--active { color: var(--text-primary); border-color: var(--separator-strong); box-shadow: var(--shadow-sm); }
.lp-tab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Business fit cards ────────────────────────────────────────────── */
.lp-fit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.lp-fit-card {
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 20px; padding: 26px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  transition: box-shadow 220ms, transform 220ms, border-color 220ms;
}
.lp-fit-card:hover {
  box-shadow: 0 18px 34px rgba(var(--accent-rgb),0.14), 0 4px 10px rgba(0,0,0,0.05);
  transform: translateY(-3px); border-color: var(--accent-border);
}
.lp-fit-card__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.lp-fit-card__title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; margin: 0; color: var(--text-primary); }
.lp-fit-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.lp-fit-list li { font-size: 14px; color: var(--text-secondary); padding-left: 16px; position: relative; }
.lp-fit-list li::before { content: ''; position: absolute; left: 0; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--text-tertiary); }

/* ── Feature detail rows (alternating) ─────────────────────────────── */
.lp-feature-rows { display: flex; flex-direction: column; }
.lp-feature-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center;
  padding: 56px 0; border-bottom: 1px solid var(--separator);
}
.lp-feature-row:last-child { border-bottom: none; padding-bottom: 0; }
.lp-feature-row:first-child { padding-top: 8px; }
.lp-feature-row--reverse .lp-feature-visual { order: -1; }
.lp-feature-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-pressed); margin: 0 0 12px; }
.lp-feature-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; margin: 0 0 14px; color: var(--text-primary); }
.lp-feature-desc { font-size: 15px; color: var(--text-secondary); line-height: 1.65; margin: 0 0 22px; max-width: 440px; }
.lp-feature-bullets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.lp-feature-bullets li { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.lp-feature-bullets svg { flex-shrink: 0; color: var(--accent); }

.lp-feature-visual {
  background: var(--bg-base); border: 1px solid var(--separator); border-radius: 22px;
  padding: 28px; min-height: 240px; display: flex; align-items: center; justify-content: center;
}

/* Invoice / receipt mockup */
.lp-invoice-stack { position: relative; width: 100%; max-width: 280px; height: 190px; }
.lp-invoice-card {
  position: absolute; inset: 0; background: var(--bg-surface); border: 1px solid var(--separator);
  border-radius: 16px; padding: 18px; box-shadow: 0 10px 24px rgba(0,0,0,0.08);
}
.lp-invoice-card--back { transform: rotate(-6deg) translate(10px, 4px); opacity: 0.7; }
.lp-invoice-card--front { transform: rotate(2deg); }
.lp-invoice-head { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed var(--separator-strong); }
.lp-invoice-badge { padding: 3px 9px; background: var(--accent-light); color: var(--accent-pressed); border-radius: 980px; font-size: 10.5px; font-weight: 700; }
.lp-invoice-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; }
.lp-invoice-total { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 800; color: var(--text-primary); padding-top: 10px; border-top: 1px solid var(--separator); }

/* Chart mockups (analytics + inventory) */
.lp-chart-card { width: 100%; }
.lp-chart-head { display: flex; gap: 28px; margin-bottom: 18px; }
.lp-chart-stat { display: flex; flex-direction: column; gap: 4px; }
.lp-chart-stat__label { font-size: 11.5px; font-weight: 600; color: var(--text-tertiary); }
.lp-chart-stat__value { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); }
.lp-chart-stat__value--warm { color: var(--accent-warm); }
.lp-chart-svg { width: 100%; height: 70px; display: block; }
.lp-chart-days { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); }

/* Roles / team table mockup */
.lp-roles-card { width: 100%; }
.lp-roles-head { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-tertiary); padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--separator); }
.lp-roles-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; }
.lp-roles-row + .lp-roles-row { border-top: 1px solid var(--separator); }
.lp-roles-person { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
.lp-roles-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; color: #fff; flex-shrink: 0; }
.lp-role-pill { padding: 4px 10px; border-radius: 980px; font-size: 11px; font-weight: 700; }
.lp-role-pill--admin { background: var(--accent-light); color: var(--accent-pressed); }
.lp-role-pill--manager { background: rgba(245,158,11,0.14); color: #b45309; }
.lp-role-pill--cashier { background: rgba(56,189,248,0.14); color: #0369a1; }

/* ── Steps ─────────────────────────────────────────────────────────── */
/* ── How it works: connected timeline (no card-in-a-row, no fake browser chrome) ── */
.lp-how-track { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 56px; }
/* 80px = 2 × the track's gap — keeps the line's endpoints under the node centers if the gap ever changes. */
.lp-how-line {
  position: absolute; top: 16px; left: calc((100% - 80px) / 6); right: calc((100% - 80px) / 6); height: 2px;
  background: var(--separator-strong); z-index: 0;
}
.lp-how-step { position: relative; padding-top: 48px; }
.lp-how-node {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 1;
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff;
  font-size: 13px; font-weight: 800; box-shadow: 0 0 0 6px var(--bg-base);
}
.lp-how-watermark {
  position: absolute; top: 14px; left: -4px; z-index: 0; pointer-events: none; user-select: none;
  font-size: 5.5rem; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: var(--bg-elevated);
}
.lp-how-visual, .lp-step-title, .lp-step-desc { position: relative; z-index: 1; }
.lp-how-visual {
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 16px;
  padding: 18px; margin-bottom: 20px; min-height: 108px; display: flex; flex-direction: column; justify-content: center; gap: 10px;
}
.lp-how-visual--modes { gap: 8px; }

.lp-step-table__head, .lp-step-table__row { display: grid; grid-template-columns: 1.3fr 1fr 0.8fr 1fr; gap: 6px; }
.lp-step-table__head { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-tertiary); padding-bottom: 8px; border-bottom: 1px solid var(--separator); }
.lp-step-table__row { font-size: 13px; font-weight: 600; color: var(--text-primary); padding-top: 2px; }
.lp-how-import-note {
  display: flex; align-items: center; gap: 7px; margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--separator-strong);
  font-size: 11.5px; font-weight: 600; color: var(--accent-pressed);
}
.lp-how-import-note svg { flex-shrink: 0; }

.lp-how-visual--receipt {
  padding: 18px 18px 26px; border-radius: 16px 16px 0 0;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 94% 100%, 88% 90%, 82% 100%, 76% 90%, 70% 100%, 64% 90%, 58% 100%, 52% 90%, 46% 100%, 40% 90%, 34% 100%, 28% 90%, 22% 100%, 16% 90%, 10% 100%, 4% 90%, 0 100%);
}
.lp-step-receipt__row, .lp-step-receipt__total { display: flex; justify-content: space-between; font-size: 13px; }
.lp-step-receipt__row { color: var(--text-secondary); }
.lp-step-receipt__total { font-weight: 700; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--separator); }

.lp-step-title { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: var(--text-primary); }
.lp-step-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.65; margin: 0; }

/* ── Pricing (dark section, all cards elevated on dark) ───────────── */
.lp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
.lp-pricing-card {
  position: relative; display: flex; flex-direction: column;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 32px 28px;
}
.lp-pricing-card--highlight {
  background: rgba(255,255,255,0.06); border-color: var(--accent);
  box-shadow: 0 24px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(var(--accent-rgb),0.3) inset;
}
.lp-pricing-badge {
  position: absolute; top: -13px; left: 28px; padding: 5px 14px;
  background: var(--accent); color: #fff; font-size: 11.5px; font-weight: 800;
  letter-spacing: 0.02em; border-radius: 980px;
}
.lp-pricing-name { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; margin: 4px 0 14px; color: rgba(255,255,255,0.65); }
.lp-pricing-card--highlight .lp-pricing-name { color: rgba(255,255,255,0.85); }
.lp-pricing-price { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: #fff; margin-bottom: 24px; }
.lp-pricing-period { display: block; font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.4); margin-top: 4px; }
.lp-pricing-alt { font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.4); margin: -18px 0 24px; }
.lp-pricing-features { list-style: none; margin: 0 0 28px; padding: 0; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.lp-pricing-features li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: rgba(255,255,255,0.7); }
.lp-pricing-features svg { flex-shrink: 0; color: var(--accent); }
.lp-pricing-cta {
  display: inline-flex; align-items: center; justify-content: center; padding: 12px 20px;
  border-radius: 12px; font-size: 14px; font-weight: 700; text-align: center; transition: opacity 150ms, background 150ms;
}
.lp-pricing-cta--primary { background: rgba(255,255,255,0.08); color: #fff; }
.lp-pricing-card--highlight .lp-pricing-cta--primary { background: var(--accent); color: #fff; }
.lp-pricing-cta--primary:hover { opacity: 0.85; }
.lp-pricing-cta--disabled { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.35); cursor: default; }

/* ── Founder note ──────────────────────────────────────────────────── */
.lp-story-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 56px; align-items: center; }
.lp-story-quote { display: flex; flex-direction: column; }
.lp-quote-glyph--story { font-family: Georgia, serif; font-size: 3.6rem; line-height: 1; color: var(--accent-border); margin-bottom: 6px; }
.lp-story-text { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.015em; line-height: 1.5; color: var(--text-primary); margin: 0 0 18px; }
.lp-story-attribution { font-size: 14px; font-weight: 600; color: var(--text-tertiary); margin: 0; }
.lp-story-values {
  background: var(--bg-base); border: 1px solid var(--separator); border-radius: 20px; padding: 28px;
}
.lp-story-values__title { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; color: var(--text-primary); margin: 0 0 16px; }
.lp-story-values__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.lp-story-values__list li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; }
.lp-story-values__list svg { flex-shrink: 0; margin-top: 3px; color: var(--accent); }

/* ── Help & support ────────────────────────────────────────────────── */
.lp-help-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lp-help-card {
  display: flex; flex-direction: column; gap: 10px; padding: 24px;
  background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 18px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  transition: box-shadow 220ms, transform 220ms, border-color 220ms;
}
.lp-help-card:hover {
  box-shadow: 0 18px 34px rgba(var(--accent-rgb),0.14), 0 4px 10px rgba(0,0,0,0.05);
  transform: translateY(-3px); border-color: var(--accent-border);
}
.lp-help-card__title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; margin: 0; color: var(--text-primary); }
.lp-help-card__desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; flex: 1; }
.lp-help-card__cta { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: var(--accent-pressed); }

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
.lp-faq-chevron { flex-shrink: 0; color: var(--text-tertiary); transition: transform 250ms var(--ease-out), color 250ms; }
.lp-faq-chevron--open { transform: rotate(180deg); color: var(--accent-pressed); }
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
.lp-btn-accent:hover { background: var(--accent-pressed); }
.lp-cta-reassure { font-size: 12.5px; color: rgba(255,255,255,0.35); margin: 0 0 20px; }
.lp-cta-secondary { font-size: 14px; color: rgba(255,255,255,0.45); }
.lp-cta-secondary a { color: #6f9dff; text-decoration: underline; text-underline-offset: 3px; }
.lp-cta-secondary a:hover { color: #fff; }
.lp-form-thanks { font-size: 16px; color: #6f9dff; margin: 0; }

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
  .lp-hero { padding: 72px 40px 64px; }
  .lp-hero-visual { max-width: 720px; }
  .lp-quote-band-inner { grid-template-columns: 1fr; gap: 32px; text-align: center; }
  .lp-quote-block { align-items: center; }
  .lp-quote-stats { grid-template-columns: repeat(3, 1fr); gap: 24px 16px; }
  .lp-stat:nth-child(3) { border-right: none; }
  .lp-experience-grid { grid-template-columns: 1fr; gap: 40px; }
  .lp-experience-visual { order: -1; }
  .lp-feature-row, .lp-feature-row--reverse { grid-template-columns: 1fr; gap: 28px; }
  .lp-feature-row--reverse .lp-feature-visual { order: 0; }
  .lp-story-grid { grid-template-columns: 1fr; gap: 32px; }
  .lp-pricing-grid { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; }
  .lp-footer-top { grid-template-columns: 1.4fr 1fr 1fr; }
}
@media (max-width: 880px) {
  .lp-how-track { grid-template-columns: 1fr; gap: 40px; }
  .lp-how-line { display: none; }
  .lp-fit-grid, .lp-help-grid { grid-template-columns: 1fr; }
  .lp-check-grid { grid-template-columns: 1fr; }
  .lp-quote-stats { grid-template-columns: repeat(2, 1fr); gap: 24px 16px; }
  .lp-stat:nth-child(2), .lp-stat:nth-child(4) { border-right: none; }
}
@media (max-width: 720px) {
  .lp-nav { padding: 0 20px; }
  .lp-nav-links { display: none; }
  .lp-section { padding: 72px 20px; }
  .lp-hero { padding: 48px 20px 48px; }
  .lp-quote-band { padding: 48px 20px; }
  .lp-footer { padding: 48px 20px 24px; }
  .lp-footer-top { grid-template-columns: 1fr 1fr; gap: 28px; text-align: left; }
  .lp-footer-bottom { text-align: center; }
}
@media (max-width: 480px) {
  .lp-quote-stats { grid-template-columns: 1fr 1fr; gap: 24px 16px; }
  .lp-stat { border-right: none; }
  .lp-email-form { flex-direction: column; align-items: center; }
  .lp-email-input { width: 100%; max-width: 340px; }
  .lp-footer-top { grid-template-columns: 1fr; }
}
</style>
