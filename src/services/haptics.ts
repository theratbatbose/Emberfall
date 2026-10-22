let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function buzz(pattern: number | number[]) {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers block vibration until the user has interacted; ignore.
  }
}

export const haptic = {
  tap: () => buzz(8),
  complete: () => buzz([18, 40, 30]),
  loot: () => buzz([30, 60, 30, 60, 80]),
  levelUp: () => buzz([40, 50, 40, 50, 120]),
};
