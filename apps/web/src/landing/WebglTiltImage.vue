<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{ src: string; alt: string; interactive?: boolean }>(), { interactive: true })

const container = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const VERTEX_SRC = `
  attribute vec2 aPos;
  attribute vec2 aUV;
  uniform mat4 uMVP;
  uniform vec2 uUVScale;
  uniform float uAspect;
  varying vec2 vUV;
  varying vec2 vPos;
  void main() {
    vUV = 0.5 + (aUV - 0.5) * uUVScale;
    vPos = aPos;
    gl_Position = uMVP * vec4(aPos.x * uAspect, aPos.y, 0.0, 1.0);
  }
`

const FRAGMENT_SRC = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform vec2 uLight;
  uniform float uGlareStrength;
  varying vec2 vUV;
  varying vec2 vPos;
  void main() {
    vec4 tex = texture2D(uTex, vUV);
    float dist = distance(vPos, uLight);
    float glare = pow(max(0.0, 1.0 - dist / 1.6), 3.0) * uGlareStrength;
    float vignette = smoothstep(1.5, 0.4, length(vPos));
    vec3 color = tex.rgb * (0.92 + 0.08 * vignette) + vec3(glare);
    gl_FragColor = vec4(color, tex.a);
  }
`

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let texture: WebGLTexture | null = null
let raf = 0
let ro: ResizeObserver | null = null

let uvScale: [number, number] = [1, 1]
let halfW = 1
let halfH = 1

const tilt = { rx: 0, ry: 0, targetRx: 0, targetRy: 0 }
const light = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 }

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

function mat4Multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k]
      out[c * 4 + r] = sum
    }
  }
  return out
}

function mat4Perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2)
  const m = new Float32Array(16)
  m[0] = f / aspect
  m[5] = f
  m[10] = (far + near) / (near - far)
  m[11] = -1
  m[14] = (2 * far * near) / (near - far)
  return m
}

function mat4Translate(x: number, y: number, z: number) {
  const m = new Float32Array(16)
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1
  m[12] = x; m[13] = y; m[14] = z
  return m
}

function mat4RotateX(rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  const m = new Float32Array(16)
  m[0] = 1; m[15] = 1
  m[5] = c; m[6] = s
  m[9] = -s; m[10] = c
  return m
}

function mat4RotateY(rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  const m = new Float32Array(16)
  m[5] = 1; m[15] = 1
  m[0] = c; m[2] = -s
  m[8] = s; m[10] = c
  return m
}

const FOV = (35 * Math.PI) / 180
const CAMERA_DIST = 1 / Math.tan(FOV / 2)

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

  const containerAspect = wrap.clientWidth / wrap.clientHeight
  halfW = containerAspect
  halfH = 1

  const img = textureImage
  if (img) {
    const imageAspect = img.width / img.height
    if (imageAspect > containerAspect) {
      uvScale = [containerAspect / imageAspect, 1]
    } else {
      uvScale = [1, imageAspect / containerAspect]
    }
  }
}

let textureImage: HTMLImageElement | null = null

function setupGeometry(glc: WebGLRenderingContext, prog: WebGLProgram) {
  const positions = new Float32Array([
    -1, 1, 1, 1, -1, -1,
    -1, -1, 1, 1, 1, -1,
  ])
  const uvs = new Float32Array([
    0, 0, 1, 0, 0, 1,
    0, 1, 1, 0, 1, 1,
  ])

  const posBuf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, posBuf)
  glc.bufferData(glc.ARRAY_BUFFER, positions, glc.STATIC_DRAW)
  const aPos = glc.getAttribLocation(prog, 'aPos')
  glc.enableVertexAttribArray(aPos)
  glc.vertexAttribPointer(aPos, 2, glc.FLOAT, false, 0, 0)

  const uvBuf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, uvBuf)
  glc.bufferData(glc.ARRAY_BUFFER, uvs, glc.STATIC_DRAW)
  const aUV = glc.getAttribLocation(prog, 'aUV')
  glc.enableVertexAttribArray(aUV)
  glc.vertexAttribPointer(aUV, 2, glc.FLOAT, false, 0, 0)
}

function render() {
  const glc = gl
  const prog = program
  if (!glc || !prog) return

  tilt.rx += (tilt.targetRx - tilt.rx) * 0.12
  tilt.ry += (tilt.targetRy - tilt.ry) * 0.12
  light.x += (light.targetX - light.x) * 0.18
  light.y += (light.targetY - light.y) * 0.18
  light.strength += (light.targetStrength - light.strength) * 0.12

  glc.clearColor(0, 0, 0, 0)
  glc.clear(glc.COLOR_BUFFER_BIT)

  const model = mat4Multiply(mat4RotateY(tilt.ry), mat4RotateX(tilt.rx))
  const view = mat4Translate(0, 0, -CAMERA_DIST)
  const cv = canvas.value
  const aspect = cv && cv.height ? cv.width / cv.height : 1
  const proj = mat4Perspective(FOV, aspect, 0.1, 10)

  let mv = mat4Multiply(view, model)
  let mvp = mat4Multiply(proj, mv)

  glc.useProgram(prog)
  glc.uniformMatrix4fv(glc.getUniformLocation(prog, 'uMVP'), false, mvp)
  glc.uniform2fv(glc.getUniformLocation(prog, 'uUVScale'), uvScale)
  glc.uniform1f(glc.getUniformLocation(prog, 'uAspect'), aspect)
  glc.uniform2f(glc.getUniformLocation(prog, 'uLight'), light.x * halfW, -light.y * halfH)
  glc.uniform1f(glc.getUniformLocation(prog, 'uGlareStrength'), light.strength)

  glc.drawArrays(glc.TRIANGLES, 0, 6)
  raf = requestAnimationFrame(render)
}

function onPointerMove(e: PointerEvent) {
  const wrap = container.value
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width * 2 - 1
  const ny = (e.clientY - rect.top) / rect.height * 2 - 1
  const maxTilt = 0.18
  tilt.targetRy = nx * maxTilt
  tilt.targetRx = -ny * maxTilt
  light.targetX = nx
  light.targetY = ny
  light.targetStrength = 0.16
}

function onPointerLeave() {
  tilt.targetRx = 0
  tilt.targetRy = 0
  light.targetStrength = 0
}

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

  setupGeometry(glc, program)
  glc.enable(glc.BLEND)
  glc.blendFunc(glc.SRC_ALPHA, glc.ONE_MINUS_SRC_ALPHA)

  texture = glc.createTexture()
  glc.bindTexture(glc.TEXTURE_2D, texture)
  glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA, 1, 1, 0, glc.RGBA, glc.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    textureImage = img
    glc.bindTexture(glc.TEXTURE_2D, texture)
    glc.pixelStorei(glc.UNPACK_FLIP_Y_WEBGL, false)
    glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA, glc.RGBA, glc.UNSIGNED_BYTE, img)
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.LINEAR)
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.LINEAR)
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE)
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE)
    resize()
  }
  img.src = props.src

  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap)

  if (props.interactive) {
    wrap.addEventListener('pointermove', onPointerMove)
    wrap.addEventListener('pointerleave', onPointerLeave)
  }

  raf = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  const wrap = container.value
  wrap?.removeEventListener('pointermove', onPointerMove)
  wrap?.removeEventListener('pointerleave', onPointerLeave)
  if (gl && texture) gl.deleteTexture(texture)
  if (gl && program) gl.deleteProgram(program)
})
</script>

<template>
  <div
    ref="container"
    class="webgl-tilt"
    role="img"
    :aria-label="alt"
    :style="{ backgroundImage: `url(${src})` }"
  >
    <canvas ref="canvas" class="webgl-tilt__canvas"></canvas>
  </div>
</template>

<style scoped>
/* backgroundImage is a static fallback shown through the canvas whenever WebGL
   is unavailable/fails (older browsers, locked-down drivers) — the canvas paints
   over it with the tilt/glare effect once a context is successfully acquired. */
.webgl-tilt { width: 100%; height: 100%; background-size: cover; background-position: center; border-radius: inherit; }
.webgl-tilt__canvas { display: block; width: 100%; height: 100%; }
</style>
