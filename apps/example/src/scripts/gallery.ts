import { getTheme, onThemeChange, setTheme, type SetThemeOptions } from 'astro-eclipse/client'

const THEMES = ['light', 'dark', 'sepia', 'forest']

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A tiny highlighter for the one shape of code this page prints. */
function highlight(source: string): string {
  return escapeHtml(source).replace(
    /('[^']*')|\b(\d+)\b|\b(setTheme)\b|\b(\w+)(?=:)/g,
    (match, str?: string, num?: string, fn?: string, key?: string) => {
      if (str) return `<span class="tok-str">${str}</span>`
      if (num) return `<span class="tok-num">${num}</span>`
      if (fn) return `<span class="tok-kw">${fn}</span>`
      if (key) return `<span class="tok-key">${key}</span>`
      return match
    },
  )
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller states the element type
function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Gallery markup is missing ${selector}`)
  return element
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
  const checked = (name: string): string => required<HTMLInputElement>(root, `input[name="${name}"]:checked`).value

  const themeList = (): string[] => THEMES.slice(0, Number(checked('count')))
  const nextTheme = (): string => {
    const list = themeList()
    return list[(list.indexOf(getTheme()) + 1) % list.length]
  }

  const originLiteral = (): string => {
    const origin = checked('origin')
    return origin === 'center' ? `'center'` : origin === 'corner' ? '{ x: 0, y: 0 }' : 'event'
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
  }

  function play(effect: string, event: MouseEvent): void {
    select.value = effect
    render()
    const origin = checked('origin')
    const options: SetThemeOptions = {
      transition: select.value,
      duration: reduced.checked ? 0 : Number(duration.value),
      origin: origin === 'center' ? 'center' : origin === 'corner' ? { x: 0, y: 0 } : event,
      direction: checked('direction') as SetThemeOptions['direction'],
    }
    setTheme(nextTheme(), options)
  }

  root.addEventListener('input', render)
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-play]') : null
    if (target) play(target.dataset.play === '' ? select.value : (target.dataset.play ?? select.value), event)
  })
  onThemeChange(render)
  os.textContent = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'
  render()
}

document.addEventListener('astro:page-load', init)
