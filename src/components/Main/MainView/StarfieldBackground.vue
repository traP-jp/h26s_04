<template>
  <canvas ref="canvasRef" :class="$style.canvas" />
</template>

<script lang="ts" setup>
import * as THREE from 'three'
import { onMounted, onUnmounted, ref } from 'vue'

import { useSkyCamera } from '/@/composables/useSkyCamera'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { camPosition, targetFov, tick } = useSkyCamera()

const STAR_COUNT = 4000
const STAR_RADIUS = 1000

// 実際の恒星の色温度分布に近づけた重み付きパレット
// w が大きいほど出現頻度が高い（青白・白が多く、赤が少ない）
const PALETTE = [
  { hex: 0x9db4ff, w: 8 },
  { hex: 0xaabfff, w: 11 },
  { hex: 0xcad7ff, w: 13 },
  { hex: 0xf6f6ff, w: 17 },
  { hex: 0xffffff, w: 18 },
  { hex: 0xfff3e6, w: 13 },
  { hex: 0xffd8a8, w: 8 },
  { hex: 0xffb56c, w: 6 },
  { hex: 0xff9966, w: 4 },
  { hex: 0xff7755, w: 2 },
]
const TOTAL_W = PALETTE.reduce((s, p) => s + p.w, 0)

const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// onUnmounted は setup 時にしか登録できないため、onMounted 内で生成したリソースの
// クリーンアップ関数をここに格納して onUnmounted から呼び出す
let cleanupFn: (() => void) | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const w = window.innerWidth
  const h = window.innerHeight

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(w, h)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000004)

  const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 3000)

  function pickColor() {
    let r = Math.random() * TOTAL_W
    for (const p of PALETTE) {
      if ((r -= p.w) <= 0) return p.hex
    }
    return 0xffffff
  }

  const positions = new Float32Array(STAR_COUNT * 3)
  const colors = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  const phases = new Float32Array(STAR_COUNT)
  const twSpeed = new Float32Array(STAR_COUNT)
  const twAmp = new Float32Array(STAR_COUNT)

  const c = new THREE.Color()
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    // acos(2v-1) により球面上に一様分布させる（naive な theta/phi だと極に偏る）
    const phi = Math.acos(2 * v - 1)
    const sinPhi = Math.sin(phi)
    positions[i * 3] = STAR_RADIUS * sinPhi * Math.cos(theta)
    positions[i * 3 + 1] = STAR_RADIUS * Math.cos(phi)
    positions[i * 3 + 2] = STAR_RADIUS * sinPhi * Math.sin(theta)

    c.setHex(pickColor())
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    sizes[i] = 1.0 + Math.pow(Math.random(), 3) * 3.5
    phases[i] = Math.random() * Math.PI * 2
    twSpeed[i] = 0.4 + Math.random() * 2.0
    twAmp[i] =
      Math.random() < 0.6 ? Math.random() * 0.35 : Math.random() * 0.08
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('twSpeed', new THREE.BufferAttribute(twSpeed, 1))
  geo.setAttribute('twAmp', new THREE.BufferAttribute(twAmp, 1))

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    // prefers-reduced-motion 時は 0 にしてまたたきを停止する
    uTwinkle: { value: prefersReduced ? 0.0 : 1.0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute float size;
      attribute float phase;
      attribute float twSpeed;
      attribute float twAmp;
      attribute vec3  customColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uTwinkle;
      varying vec3  vColor;
      varying float vBright;
      void main() {
        vColor = customColor;
        float tw = 1.0 - uTwinkle * twAmp * (0.5 + 0.5 * sin(uTime * twSpeed + phase));
        vBright = tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * tw * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3  vColor;
      varying float vBright;
      void main() {
        vec2 q = gl_PointCoord - vec2(0.5);
        float d = length(q);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 1.4);
        gl_FragColor = vec4(vColor * vBright, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    // 加算合成により重なった星が明るく光る発光表現になる
    blending: THREE.AdditiveBlending,
  })

  const stars = new THREE.Points(geo, material)
  scene.add(stars)

  const clock = new THREE.Clock()
  let animId = 0

  function animate() {
    animId = requestAnimationFrame(animate)
    uniforms.uTime.value = clock.getElapsedTime()

    tick()

    camera.position.copy(camPosition.value)
    camera.lookAt(0, 0, 0)

    if (Math.abs(camera.fov - targetFov.value) > 0.01) {
      camera.fov += (targetFov.value - camera.fov) * 0.12
      camera.updateProjectionMatrix()
    }

    renderer.render(scene, camera)
  }
  animate()

  const onResize = () => {
    const pw = window.innerWidth
    const ph = window.innerHeight
    const pr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(pr)
    renderer.setSize(pw, ph)
    uniforms.uPixelRatio.value = pr
    camera.aspect = pw / ph
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  cleanupFn = () => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    geo.dispose()
    material.dispose()
  }
})

onUnmounted(() => {
  cleanupFn?.()
})
</script>

<style lang="scss" module>
.canvas {
  /* position: fixed でビューポート全体を覆い、親要素のレイアウトに依存しない */
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
