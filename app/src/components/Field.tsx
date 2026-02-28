export function Field(props: {
  label: string
  value: string
  onInput: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label class="mb-1 block text-xs text-[var(--color-text-muted)]">{props.label}</label>
      <input
        class="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        type={props.type ?? 'text'}
        value={props.value}
        onInput={e => props.onInput(e.currentTarget.value)}
        placeholder={props.placeholder}
      />
    </div>
  )
}
