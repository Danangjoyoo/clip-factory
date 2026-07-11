import { useState, type ReactNode } from 'react';
export type InspectorTab = 'caption' | 'frame' | 'metadata';
export function InspectorTabs({ children }: Readonly<{ children: Partial<Record<InspectorTab, ReactNode>> }>) {
  const [active, setActive] = useState<InspectorTab>('caption');
  const tabs: InspectorTab[] = ['caption', 'frame', 'metadata'];
  return <section><div role="tablist" aria-label="Clip inspectors">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} tabIndex={active === tab ? 0 : -1} onClick={() => setActive(tab)}>{tab[0]!.toUpperCase() + tab.slice(1)}</button>)}</div><div role="tabpanel">{children[active] ?? null}</div></section>;
}
