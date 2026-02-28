import MarkdownIt from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import katex from 'katex'
import hljs from 'highlight.js/lib/common'

const md: MarkdownIt = new MarkdownIt({
  linkify: true,
  highlight(str, lang): string {
    if (lang === 'math' || lang === 'latex') {
      try {
        return katex.renderToString(str.trim(), { displayMode: true, throwOnError: false })
      } catch {
        return ''
      }
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch { /* fall through */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

function mathPlugin(md: MarkdownIt) {
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule)
  md.renderer.rules.math_inline = (tokens, idx) => {
    try {
      return katex.renderToString(tokens[idx].content, { throwOnError: false })
    } catch {
      return `<code>${md.utils.escapeHtml(tokens[idx].content)}</code>`
    }
  }
  md.renderer.rules.math_display = (tokens, idx) => {
    try {
      return `<div class="math-display">${katex.renderToString(tokens[idx].content, { displayMode: true, throwOnError: false })}</div>`
    } catch {
      return `<pre><code>${md.utils.escapeHtml(tokens[idx].content)}</code></pre>`
    }
  }
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const pos = state.pos
  if (src[pos] !== '$') return false

  if (src[pos + 1] === '$') {
    const contentStart = pos + 2
    const end = src.indexOf('$$', contentStart)
    if (end === -1 || end === contentStart) return false
    if (!silent) {
      const token = state.push('math_display', 'math', 0)
      token.content = src.slice(contentStart, end).trim()
    }
    state.pos = end + 2
    return true
  }

  const contentStart = pos + 1
  if (contentStart >= src.length || src[contentStart] === ' ') return false

  let end = contentStart
  while (end < src.length) {
    if (src[end] === '$' && src[end - 1] !== '\\') break
    if (src[end] === '\n') return false
    end++
  }
  if (end >= src.length || end === contentStart) return false
  if (src[end - 1] === ' ') return false

  if (!silent) {
    const token = state.push('math_inline', 'math', 0)
    token.content = src.slice(contentStart, end)
  }
  state.pos = end + 1
  return true
}

md.use(mathPlugin)

export function renderMarkdown(content: string): string {
  return md.render(content)
}
