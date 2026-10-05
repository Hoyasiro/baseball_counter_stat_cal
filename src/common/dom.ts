type Child = Node | string | null | undefined | false;

interface Props {
  className?: string;
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
  attrs?: Record<string, string>;
}

/** 여러 개 중 하나를 고르는 단추 줄 (탭 안의 작은 탭) */
export function segmented<T extends string>(options: readonly [T, string][], selected: T, onSelect: (v: T) => void, className: string): HTMLElement {
  return h(
    'div',
    { className, attrs: { role: 'tablist' } },
    options.map(([value, label]) =>
      h('button', {
        className: value === selected ? 'active' : '',
        text: label,
        attrs: { role: 'tab', 'aria-selected': value === selected ? 'true' : 'false' },
        onClick: () => onSelect(value),
      }),
    ),
  );
}

/** 작은 DOM 생성 도우미. 화면 코드를 짧게 유지하기 위해 쓴다. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.className) el.className = props.className;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.onClick) el.addEventListener('click', props.onClick);
  if (props.disabled && el instanceof HTMLButtonElement) el.disabled = true;
  for (const [name, value] of Object.entries(props.attrs ?? {})) el.setAttribute(name, value);
  for (const child of children) {
    if (child) el.append(child);
  }
  return el;
}
