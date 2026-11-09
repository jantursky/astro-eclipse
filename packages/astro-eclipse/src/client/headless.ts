import { setTheme, type SetThemeOptions } from './index.js'

const SELECTOR = '[data-eclipse-set]'

// One listener on `document` serves every element on the page, including ones a ClientRouter navigation brings in.
// Injected as a page script by the integration when `headless` is on.
document.addEventListener('click', (event) => {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null
  if (!element) return
  const { eclipseSet = '', transition, duration, direction } = element.dataset
  // The element is a control, not a destination: a link such as href="#" must not also navigate.
  event.preventDefault()
  const options: SetThemeOptions = {
    origin: event,
    ...(transition && { transition }),
    ...(duration && { duration: Number(duration) }),
    ...(direction && { direction: direction as SetThemeOptions['direction'] }),
  }
  try {
    setTheme(eclipseSet, options)
  } catch (error) {
    // An unknown value is the author's mistake, and `setTheme` names it and lists the known themes.
    console.error(`${(error as Error).message} (data-eclipse-set on <${element.localName}>)`)
  }
})
