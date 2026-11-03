import {
  getTheme,
  getTransition,
  onThemeChange,
  setTheme,
  type Direction,
  type SetThemeOptions,
} from 'astro-eclipse/client'

import { highlight } from '../lib/highlight'

const THEMES = ['light', 'dark', 'sepia', 'forest']

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller states the element type
function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Gallery markup is missing ${selector}`)
  return element
}

/** The point for a fixed origin choice in a box of this size. `click` has none: it follows the pointer. */
function pointFor(origin: string, width: number, height: number): { x: number; y: number } | undefined {
  if (origin === 'center') return { x: width / 2, y: height / 2 }
  if (origin === 'click') return undefined
  return { x: origin.endsWith('right') ? width : 0, y: origin.startsWith('bottom') ? height : 0 }
}

const prefersReducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

interface PreviewOptions {
  effect: string
  /** Length of one pass, in ms. 0 shows a still frame instead of moving. */
  duration: number
  origin: { x: number; y: number }
  direction: Direction
}

/** Loop an effect inside a two-layer box, using the same keyframes the real transition runs. */
function mountPreview(preview: HTMLElement, options: PreviewOptions): void {
  const layers = {
    old: preview.querySelector<HTMLElement>('.pv-old'),
    new: preview.querySelector<HTMLElement>('.pv-new'),
  }
  for (const layer of Object.values(layers)) {
    for (const animation of layer?.getAnimations() ?? []) animation.cancel()
    layer?.style.removeProperty('z-index')
  }
  const definition = getTransition(options.effect)
  if (!definition) return
  const { width, height } = preview.getBoundingClientRect()
  const context = { origin: options.origin, direction: options.direction, width, height }
  layers[definition.top === 'old' ? 'old' : 'new']?.style.setProperty('z-index', '2')
  const still = options.duration <= 0
  const duration = still ? PREVIEW_DURATION : options.duration
  for (const name of ['old', 'new'] as const) {
    const keyframes = definition[name]?.(context)
    const layer = layers[name]
    if (!keyframes || !layer) continue
    const animation = layer.animate(keyframes, {
      duration,
      endDelay: 500,
      delay: 300,
      easing: 'ease-in-out',
      fill: 'both',
      iterations: Infinity,
      direction: 'alternate',
    })
    // A still frame halfway through the effect, for reduced motion.
    if (still) {
      animation.pause()
      animation.currentTime = 300 + duration / 2
    }
  }
}

const PREVIEW_DURATION = 1200

/** The small squares in the list of all effects. */
function startPreviews(root: ParentNode): void {
  const reduced = prefersReducedMotion()
  for (const preview of root.querySelectorAll<HTMLElement>('[data-preview]')) {
    const { width, height } = preview.getBoundingClientRect()
    mountPreview(preview, {
      effect: preview.dataset.preview ?? '',
      duration: reduced ? 0 : PREVIEW_DURATION,
      origin: { x: width * 0.35, y: height * 0.6 },
      direction: 'right',
    })
  }
}

/** Open or close the code under one effect. `inert` keeps a closed panel out of the tab order. */
function toggleCode(button: HTMLElement): void {
  const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')
  if (!panel) return
  const open = button.getAttribute('aria-expanded') !== 'true'
  button.setAttribute('aria-expanded', String(open))
  const label = button.querySelector('[data-expand-label]')
  if (label) label.textContent = open ? 'Hide code' : 'Show code'
  panel.classList.toggle('open', open)
  panel.toggleAttribute('inert', !open)
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-gallery]')
  if (!root) return
  const select = required<HTMLSelectElement>(root, '#effect')
  const duration = required<HTMLInputElement>(root, '#duration')
  const durationOut = required<HTMLOutputElement>(root, '#duration-out')
  const reduced = required<HTMLInputElement>(root, '#reduced')
  const source = required<HTMLElement>(root, '[data-source]')
  const cycle = required<HTMLElement>(root, '[data-cycle]')
  const note = required<HTMLElement>(root, '[data-note]')
  const os = required<HTMLElement>(root, '[data-os-motion]')
  const stage = required<HTMLElement>(root, '[data-stage]')
  let stageKey = ''
  const checked = (name: string): string => required<HTMLInputElement>(root, `input[name="${name}"]:checked`).value

  const themeList = (): string[] => THEMES.slice(0, Number(checked('count')))
  const nextTheme = (): string => {
    const list = themeList()
    return list[(list.indexOf(getTheme()) + 1) % list.length]
  }

  const originLiteral = (): string => {
    const origin = checked('origin')
    if (origin === 'click') return 'event'
    if (origin === 'center') return `'center'`
    const x = origin.endsWith('right') ? 'window.innerWidth' : '0'
    const y = origin.startsWith('bottom') ? 'window.innerHeight' : '0'
    return `{ x: ${x}, y: ${y} }`
  }

  function render(): void {
    durationOut.textContent = `${duration.value} ms`
    const value = reduced.checked ? 0 : Number(duration.value)
    source.innerHTML = highlight(
      `setTheme('${nextTheme()}', {\n  transition: '${select.value}',\n  duration: ${value},\n  origin: ${originLiteral()},\n  direction: '${checked('direction')}',\n})`,
    )
    cycle.textContent = themeList().join(' > ')
    const option = select.selectedOptions[0]
    note.hidden = option.dataset.verified === 'true'
    renderStage()
  }

  /** The big preview follows every control, and only restarts when one of them changed. */
  function renderStage(): void {
    const { width, height } = stage.getBoundingClientRect()
    const origin = checked('origin')
    const options: PreviewOptions = {
      effect: select.value,
      duration: reduced.checked || prefersReducedMotion() ? 0 : Number(duration.value),
      origin: pointFor(origin, width, height) ?? { x: width * 0.35, y: height * 0.6 },
      direction: checked('direction') as Direction,
    }
    const key = JSON.stringify([options, Math.round(width), Math.round(height)])
    if (key === stageKey) return
    stageKey = key
    mountPreview(stage, options)
  }

  function play(effect: string, event: MouseEvent): void {
    select.value = effect
    render()
    const origin = checked('origin')
    const options: SetThemeOptions = {
      transition: select.value,
      duration: reduced.checked ? 0 : Number(duration.value),
      origin: pointFor(origin, innerWidth, innerHeight) ?? event,
      direction: checked('direction') as SetThemeOptions['direction'],
    }
    setTheme(nextTheme(), options)
  }

  startPreviews(root)
  root.addEventListener('input', render)
  root.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null
    const toggle = element?.closest<HTMLElement>('[data-expand]')
    if (toggle) {
      toggleCode(toggle)
      return
    }
    const target = element?.closest<HTMLElement>('[data-play]')
    if (target) play(target.dataset.play === '' ? select.value : (target.dataset.play ?? select.value), event)
  })
  onThemeChange(render)
  new ResizeObserver(renderStage).observe(stage)
  os.textContent = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'
  render()
}

document.addEventListener('astro:page-load', init)
