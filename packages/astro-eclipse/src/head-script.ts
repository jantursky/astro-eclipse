import type { EclipseConfig } from './config.js'
import { supportsSystem } from './config.js'

/**
 * The script injected into every `<head>`. It runs before first paint, so the page never shows the
 * wrong theme, and it keeps three things in sync without any client bundle: Astro's page swaps,
 * `prefers-color-scheme` while the choice is "system", and other tabs. When storage cannot be read, the
 * theme already on the page is the choice, so it survives a ClientRouter swap. Written by hand and kept
 * small on purpose; its size is a budget in `.size-limit.json`.
 */
export function buildHeadScript(config: EclipseConfig): string {
  const data = JSON.stringify({
    t: config.themes,
    d: config.default,
    a: config.attribute,
    k: config.storageKey,
    s: supportsSystem(config),
    c: config.colorScheme,
    m: config.themeColor,
    v: config.values,
  }).replace(/</g, '\\u003c')

  return (
    `(function(w,d,c){` +
    `var h=d.documentElement,m=w.matchMedia('(prefers-color-scheme: dark)');` +
    (config.values
      ? `function z(t){return(c.v[t]||t).split(' ')}` +
        `function g(){var x,n=0,y=h.getAttribute(c.a);if(c.a=='class')c.t.forEach(function(t){var k=z(t);` +
        `k.length>=n&&k.every(function(j){return h.classList.contains(j)})&&(x=t,n=k.length)});` +
        `else c.t.forEach(function(t){(c.v[t]||t)==y&&(x=t)});return c.t.indexOf(x)>-1&&x}`
      : `function g(){var x;if(c.a=='class')c.t.forEach(function(t){h.classList.contains(t)&&(x=t)});` +
        `else x=h.getAttribute(c.a);return c.t.indexOf(x)>-1&&x}`) +
    `function p(){var v;try{v=localStorage.getItem(c.k)}catch(e){v=g()}` +
    `return v&&(v=='system'?c.s:c.t.indexOf(v)>-1)?v:c.d}` +
    `function r(){var v=p();return v=='system'?m.matches?'dark':'light':v}` +
    (config.forcedTheme
      ? `function f(e){var x=e.getAttribute('data-eclipse-forced');return c.t.indexOf(x)>-1?x:void 0}`
      : '') +
    `function a(e){var t=${config.forcedTheme ? 'f(e)||r()' : 'r()'};` +
    (config.values
      ? `if(c.a=='class'){c.t.forEach(function(x){z(x).forEach(function(j){e.classList.remove(j)})});` +
        `z(t).forEach(function(j){e.classList.add(j)})}else e.setAttribute(c.a,c.v[t]||t)`
      : `if(c.a=='class')c.t.forEach(function(x){e.classList.toggle(x,x==t)});` + `else e.setAttribute(c.a,t)`) +
    (config.colorScheme
      ? `;c.c[t]?e.style.setProperty('color-scheme',c.c[t]):e.style.removeProperty('color-scheme')`
      : '') +
    (config.themeColor
      ? `;if(c.m[t]){var o=e.ownerDocument,q=o.head.querySelector('meta[name=theme-color]:not([media])');` +
        `q||(q=o.createElement('meta'),q.name='theme-color',o.head.appendChild(q));q.content=c.m[t]}`
      : '') +
    `}` +
    (config.forcedTheme
      ? `function u(){a(h);d.dispatchEvent(new CustomEvent('eclipse:change',{detail:{theme:f(h)||r(),preference:p(),forced:f(h)}}))}`
      : `function u(){a(h);d.dispatchEvent(new CustomEvent('eclipse:change',{detail:{theme:r(),preference:p()}}))}`) +
    `a(h);` +
    `m.addEventListener('change',function(){p()=='system'&&u()});` +
    `w.addEventListener('storage',function(e){(!e.key||e.key==c.k)&&u()});` +
    `d.addEventListener('astro:before-swap',function(e){a(e.newDocument.documentElement)})` +
    `})(window,document,${data})`
  )
}
