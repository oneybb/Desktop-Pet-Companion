/**
 * Pointer-based Electron window move (replaces tiny -webkit-app-region handles that vanish on drag).
 */

import type { PointerEvent as ReactPointerEvent } from 'react';

export function beginDesktopWindowDrag(
  event: ReactPointerEvent,
  opts?: { onStart?: () => void; onEnd?: () => void }
): boolean {
  if (!window.desktopPet?.moveWindowBy) return false;
  if (event.button !== 0) return false;

  event.preventDefault();
  event.stopPropagation();
  opts?.onStart?.();

  let lastX = event.screenX;
  let lastY = event.screenY;

  const onPointerMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.screenX - lastX;
    const dy = moveEvent.screenY - lastY;
    lastX = moveEvent.screenX;
    lastY = moveEvent.screenY;
    if (dx !== 0 || dy !== 0) {
      window.desktopPet?.moveWindowBy(dx, dy);
    }
  };

  const end = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    opts?.onEnd?.();
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  return true;
}
