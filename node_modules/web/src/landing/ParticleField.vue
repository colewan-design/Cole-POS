<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    density?: number
    variant?: 'light' | 'dark'
    repelRadius?: number
    repelStrength?: number
    speed?: number
  }>(),
  {
    density: 32,
    variant: 'light',
    repelRadius: 0.55,
    repelStrength: 0.4,
    speed: 0.05,
  },
)

const container = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const VERTEX_SRC = `
  attribute vec2 aPos;
  attribute float aSize;
  attribute float aAlpha;
  uniform vec2 uHalf;
  varying float vAlpha;
  void main() {
    gl_Position = vec4(aPos.x / uHalf.x, aPos.y / uHalf.y, 0.0, 1.0);
    gl_PointSize = aSize;
    vAlpha = aAlpha;
  }
`

const FRAGMENT_SRC = `
  precision mediump float;
  uniform vec4 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(uColor.rgb, uColor.a * a);
  }
`

type Particle = { baseX: number; baseY: number; vx: number; vy: number; dispX: number; dispY: number; size: number; alpha: number }

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let posBuf: WebGLBuffer | null = null
let raf = 0
let ro: ResizeObserver | null = null

let halfW = 1
let halfH = 1
let particles: Particle[] = []
let posArray = new Float32Array(0)

const pointer = { x: 0, y: 0, active: false, targetActive: false }

function compileShader(glc: WebGLRenderingContext, type: number, source: string) {
  const shader = glc.createShader(type)
  if (!shader) throw new Error('shader create failed')
  glc.shaderSource(shader, source)
  glc.compileShader(shader)
  if (!glc.getShaderParameter(shader, glc.COMPILE_STATUS)) {
    const log = glc.getShaderInfoLog(shader)
    glc.deleteShader(shader)
    throw new Error(log ?? 'shader compile failed')
  }
  return shader
}

function createProgram(glc: WebGLRenderingContext) {
  const vs = compileShader(glc, glc.VERTEX_SHADER, VERTEX_SRC)
  const fs = compileShader(glc, glc.FRAGMENT_SHADER, FRAGMENT_SRC)
  const prog = glc.createProgram()
  if (!prog) throw new Error('program create failed')
  glc.attachShader(prog, vs)
  glc.attachShader(prog, fs)
  glc.linkProgram(prog)
  if (!glc.getProgramParameter(prog, glc.LINK_STATUS)) {
    const log = glc.getProgramInfoLog(prog)
    throw new Error(log ?? 'program link failed')
  }
  return prog
}

function seedParticles() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  particles = Array.from({ length: props.density }, () => ({
    baseX: (Math.random() * 2 - 1) * halfW,
    baseY: (Math.random() * 2 - 1) * halfH,
    vx: (Math.random() * 2 - 1) * props.speed,
    vy: (Math.random() * 2 - 1) * props.speed,
    dispX: 0,
    dispY: 0,
    size: (1.6 + Math.random() * 2.4) * dpr,
    alpha: 0.25 + Math.random() * 0.45,
  }))
  posArray = new Float32Array(particles.length * 2)
}

function resize() {
  const glc = gl
  const cv = canvas.value
  const wrap = container.value
  if (!glc || !cv || !wrap) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(wrap.clientWidth * dpr))
  const h = Math.max(1, Math.round(wrap.clientHeight * dpr))
  if (cv.width !== w || cv.height !== h) {
    cv.width = w
    cv.height = h
  }
  glc.viewport(0, 0, w, h)
  halfW = wrap.clientWidth / wrap.clientHeight
  halfH = 1
  if (particles.length === 0) seedParticles()
}

function step() {
  for (const p of particles) {
    p.baseX += p.vx * 0.016
    p.baseY += p.vy * 0.016
    if (p.baseX > halfW + 0.05) p.baseX = -halfW - 0.05
    if (p.baseX < -halfW - 0.05) p.baseX = halfW + 0.05
    if (p.baseY > halfH + 0.05) p.baseY = -halfH - 0.05
    if (p.baseY < -halfH - 0.05) p.baseY = halfH + 0.05

    let targetDispX = 0
    let targetDispY = 0
    if (pointer.active) {
      const dx = p.baseX - pointer.x
      const dy = p.baseY - pointer.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < props.repelRadius && dist > 0.0001) {
        const force = (1 - dist / props.repelRadius) * props.repelStrength
        targetDispX = (dx / dist) * force
        targetDispY = (dy / dist) * force
      }
    }
    p.dispX += (targetDispX - p.dispX) * 0.12
    p.dispY += (targetDispY - p.dispY) * 0.12
  }
}

function render() {
  const glc = gl
  const prog = program
  if (!glc || !prog) return

  step()

  particles.forEach((p, i) => {
    posArray[i * 2] = p.baseX + p.dispX
    posArray[i * 2 + 1] = p.baseY + p.dispY
  })

  glc.clearColor(0, 0, 0, 0)
  glc.clear(glc.COLOR_BUFFER_BIT)
  glc.useProgram(prog)
  glc.uniform2f(glc.getUniformLocation(prog, 'uHalf'), halfW, halfH)
  const color = props.variant === 'dark' ? [1, 1, 1, 0.85] : [0.35, 0.39, 0.44, 0.6]
  glc.uniform4fv(glc.getUniformLocation(prog, 'uColor'), color)

  glc.bindBuffer(glc.ARRAY_BUFFER, posBuf)
  glc.bufferData(glc.ARRAY_BUFFER, posArray, glc.DYNAMIC_DRAW)

  raf = requestAnimationFrame(render)
  glc.drawArrays(glc.POINTS, 0, particles.length)
}

function setPointerFromEvent(e: PointerEvent) {
  const wrap = container.value
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
  pointer.x = nx * halfW
  pointer.y = -ny * halfH
  pointer.active = true
}

function clearPointer() {
  pointer.active = false
}

defineExpose({ setPointerFromEvent, clearPointer })

onMounted(() => {
  const cv = canvas.value
  const wrap = container.value
  if (!cv || !wrap) return

  const glc = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
  if (!glc) return
  gl = glc

  try {
    program = createProgram(glc)
  } catch {
    return
  }

  posBuf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, posBuf)
  const aPos = glc.getAttribLocation(program, 'aPos')
  glc.enableVertexAttribArray(aPos)
  glc.vertexAttribPointer(aPos, 2, glc.FLOAT, false, 0, 0)

  resize()

  const sizeBuf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, sizeBuf)
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array(particles.map((p) => p.size)), glc.STATIC_DRAW)
  const aSize = glc.getAttribLocation(program, 'aSize')
  glc.enableVertexAttribArray(aSize)
  glc.vertexAttribPointer(aSize, 1, glc.FLOAT, false, 0, 0)

  const alphaBuf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, alphaBuf)
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array(particles.map((p) => p.alpha)), glc.STATIC_DRAW)
  const aAlpha = glc.getAttribLocation(program, 'aAlpha')
  glc.enableVertexAttribArray(aAlpha)
  glc.vertexAttribPointer(aAlpha, 1, glc.FLOAT, false, 0, 0)

  glc.enable(glc.BLEND)
  glc.blendFunc(glc.SRC_ALPHA, glc.ONE_MINUS_SRC_ALPHA)

  ro = new ResizeObserver(resize)
  ro.observe(wrap)

  raf = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  if (gl && posBuf) gl.deleteBuffer(posBuf)
  if (gl && program) gl.deleteProgram(program)
})
</script>

<template>
  <div ref="container" class="particle-field">
    <canvas ref="canvas" class="particle-field__canvas"></canvas>
  </div>
</template>

<style scoped>
.particle-field { width: 100%; height: 100%; }
.particle-field__canvas { display: block; width: 100%; height: 100%; }
</style>
