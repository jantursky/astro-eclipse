import type { EclipseConfig } from './config.js'
import { supportsSystem } from './config.js'

/**
 * The script injected into every `<head>`. It runs before first paint, so the page never shows the
 * wrong theme, and it keeps three things in sync without any client bundle: Astro's page swaps,
 * `prefers-color-scheme` while the choice is "system", and other tabs. Written by hand and kept
 * small on purpose; its size is a budget in `.size-limit.json`.
 */
export function buildHeadScript(config: EclipseConfig): string {
  const data = JSON.stringify({
    t: config.themes,
    d: config.default,
    a: config.attribute,
    k: config.storageKey,
    s: supportsSystem(config),
  }).replace(/</g, '\\u003c')

  return (
    `(function(w,d,c){` +
    `var h=d.documentElement,m=w.matchMedia('(prefers-color-scheme: dark)');` +
    `function p(){var v;try{v=localStorage.getItem(c.k)}catch(e){}` +
    `return v&&(v=='system'?c.s:c.t.indexOf(v)>-1)?v:c.d}` +
    `function r(){var v=p();return v=='system'?m.matches?'dark':'light':v}` +
    `function a(e){var t=r();` +
    `if(c.a=='class')c.t.forEach(function(x){e.classList.toggle(x,x==t)});` +
    `else e.setAttribute(c.a,t)}` +
    `function u(){a(h);d.dispatchEvent(new CustomEvent('eclipse:change',{detail:{theme:r(),preference:p()}}))}` +
    `a(h);` +
    `m.addEventListener('change',function(){p()=='system'&&u()});` +
    `w.addEventListener('storage',function(e){e.key==c.k&&u()});` +
    `d.addEventListener('astro:before-swap',function(e){a(e.newDocument.documentElement)})` +
    `})(window,document,${data})`
  )
}
