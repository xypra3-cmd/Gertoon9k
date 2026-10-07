// Two-sided card that turns around its vertical axis (CSS 3D, no library). Both faces share one grid
// cell, so the box is as tall as the taller face. Swipe sideways on touch screens to flip in that
// direction; the parent can also flip it (e.g. a button). Reduced motion → instant swap.
import { useRef, type ReactNode } from 'react';

export function FlipCard({
  turns,
  onTurn,
  front,
  back,
}: {
  /** Accumulated half-turns: even = front, odd = back. Sign is the direction. */
  turns: number;
  onTurn: (next: number) => void;
  front: ReactNode;
  back: ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const showingBack = Math.abs(turns) % 2 === 1;
  const face = 'col-start-1 row-start-1 backface-hidden [-webkit-backface-visibility:hidden]';
  return (
    <div
      className="perspective-[1600px]"
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') start.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) onTurn(turns + (dx > 0 ? 1 : -1));
      }}
      onPointerCancel={() => (start.current = null)}
    >
      <div
        data-testid="flip-card"
        data-side={showingBack ? 'back' : 'front'}
        className="grid transition-transform duration-700 ease-out transform-3d motion-reduce:transition-none"
        style={{ transform: `rotateY(${turns * 180}deg)` }}
      >
        <div className={face} aria-hidden={showingBack} inert={showingBack}>
          {front}
        </div>
        <div className={`${face} transform-[rotateY(180deg)]`} aria-hidden={!showingBack} inert={!showingBack}>
          {back}
        </div>
      </div>
    </div>
  );
}
