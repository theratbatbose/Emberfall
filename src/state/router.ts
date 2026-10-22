import { useSyncExternalStore } from 'react';

// Tiny hash router so Android's back gesture works inside the installed app.

function current(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const raw = useSyncExternalStore(subscribe, current, () => '/');
  const [path, qs] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs ?? '') };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = '#' + to;
  if (opts.replace) window.location.replace(target);
  else window.location.hash = to;
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}
