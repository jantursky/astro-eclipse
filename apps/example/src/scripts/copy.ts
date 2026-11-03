/** Copy text with the async clipboard. It needs a secure context (https or localhost) and a user click. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const copyTimers = new WeakMap<HTMLElement, number>()

async function copyCode(button: HTMLElement): Promise<void> {
  const text = button.closest('figure')?.querySelector('pre')?.textContent
  if (!text || !(await copyText(text))) return
  const status = button.querySelector('[data-copy-status]')
  button.setAttribute('data-copied', '')
  button.setAttribute('aria-label', 'Copied')
  if (status) status.textContent = 'Copied to clipboard'
  window.clearTimeout(copyTimers.get(button))
  copyTimers.set(
    button,
    window.setTimeout(() => {
      button.removeAttribute('data-copied')
      button.setAttribute('aria-label', 'Copy code')
      if (status) status.textContent = ''
    }, 1800),
  )
}

// One listener for every copy button on every page. A module runs once, also across ClientRouter navigations.
document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-copy]') : null
  if (button) void copyCode(button)
})
