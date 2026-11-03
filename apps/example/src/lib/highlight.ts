const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const TOKEN =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(<\/?[A-Z]\w*)|\b(import|from|const|let|true|false|new)\b|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)(?=\s*:(?!:)|=)|([{}()[\]<>=,;/:])/g

const CLASS = ['tok-com', 'tok-str', 'tok-tag', 'tok-kw', 'tok-num', 'tok-fn', 'tok-key', 'tok-pun'] as const

/** A small highlighter for the few shapes of code the demo prints: JS, Astro tags and comments. */
export function highlight(source: string): string {
  let html = ''
  let last = 0
  for (const match of source.matchAll(TOKEN)) {
    html += escapeHtml(source.slice(last, match.index))
    const group = match.slice(1).findIndex(Boolean)
    html += `<span class="${CLASS[group]}">${escapeHtml(match[0])}</span>`
    last = match.index + match[0].length
  }
  return html + escapeHtml(source.slice(last))
}
