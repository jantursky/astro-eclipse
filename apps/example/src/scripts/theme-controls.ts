import { getPreference, getTheme, onThemeChange, setTheme, toggleTheme } from 'astro-eclipse/client'

function sync(): void {
  const theme = getTheme()
  const preference = getPreference()
  for (const el of document.querySelectorAll('[data-theme-name]')) el.textContent = theme
  for (const el of document.querySelectorAll('[data-theme-pref]')) el.textContent = preference
  for (const el of document.querySelectorAll<HTMLElement>('[data-set-theme]')) {
    el.setAttribute('aria-pressed', String(el.dataset.setTheme === preference))
  }
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return
  if (event.target.closest('[data-theme-toggle]')) {
    toggleTheme({ origin: event })
    return
  }
  const setter = event.target.closest<HTMLElement>('[data-set-theme]')
  if (setter?.dataset.setTheme) setTheme(setter.dataset.setTheme, { origin: event })
})

onThemeChange(sync)
document.addEventListener('astro:page-load', sync)
sync()
