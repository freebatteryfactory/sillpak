type Disposer = () => void;
const disposers = new WeakMap<Element, Disposer>();
const claimed = new Set<Element>();
let lifecycleInstalled = false;

export function claimIsland(element: Element, start: () => Disposer): void {
  if (disposers.has(element)) return;
  disposers.set(element, start());
  claimed.add(element);
}

export function releaseIsland(element: Element): void {
  disposers.get(element)?.();
  disposers.delete(element);
  claimed.delete(element);
}

export function releaseDisconnectedIslands(): void {
  for (const element of [...claimed]) {
    if (!element.isConnected) releaseIsland(element);
  }
}

export function installIslandLifecycle(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  document.addEventListener('astro:after-swap', releaseDisconnectedIslands);
  window.addEventListener('beforeunload', () => {
    for (const element of [...claimed]) releaseIsland(element);
  }, { once: true });
}
