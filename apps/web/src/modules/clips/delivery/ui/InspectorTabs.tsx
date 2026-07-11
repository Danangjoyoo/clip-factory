import { useState, type KeyboardEvent, type ReactNode } from 'react';
export type InspectorTab = 'caption' | 'frame' | 'metadata';
export function InspectorTabs({ children }: Readonly<{ children: Partial<Record<InspectorTab, ReactNode>> }>) {
  const [active, setActive] = useState<InspectorTab>('caption');
  const tabs: InspectorTab[] = ['caption', 'frame', 'metadata'];
  const move = (event: KeyboardEvent) => { const i = tabs.indexOf(active); const next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : i; if (next !== i) { event.preventDefault(); setActive(tabs[next]!); } };
  return <section><div role="tablist" aria-label="Clip inspectors" onKeyDown={move}>{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} tabIndex={active === tab ? 0 : -1} onClick={() => setActive(tab)}>{tab[0]!.toUpperCase() + tab.slice(1)}</button>)}</div><div role="tabpanel" aria-label={`${active} inspector`}>{children[active] ?? null}</div></section>;
}
