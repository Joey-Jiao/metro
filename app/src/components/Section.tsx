import type { JSX } from 'solid-js'

export function Section(props: { title: string; children: JSX.Element }) {
  return (
    <div class="space-y-3">
      <h2 class="text-sm font-medium text-[var(--color-text)]">{props.title}</h2>
      {props.children}
    </div>
  )
}
