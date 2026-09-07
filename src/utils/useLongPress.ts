import { useRef, useCallback } from 'react';

interface UseLongPressOptions<T = any> {
  threshold?: number;
  onLongPress: (item: T) => void;
  onClick?: (item: T) => void;
}

export function useLongPress<T = any>({
  threshold = 500,
  onLongPress,
  onClick,
}: UseLongPressOptions<T>) {
  const timerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent, item: T) => {
      isLongPressRef.current = false;
      if ('touches' in e && e.touches.length > 0) {
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if ('clientX' in e) {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(() => {
        isLongPressRef.current = true;
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(50);
          } catch {}
        }
        onLongPress(item);
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return;
      let currentX = 0;
      let currentY = 0;
      if ('touches' in e && e.touches.length > 0) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const diffX = Math.abs(currentX - startPosRef.current.x);
      const diffY = Math.abs(currentY - startPosRef.current.y);

      // If moved more than 10px, cancel to allow scrolling
      if (diffX > 10 || diffY > 10) {
        cancel();
      }
    },
    [cancel]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, item: T) => {
      if (isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressRef.current = false;
        return;
      }
      if (onClick) {
        onClick(item);
      }
    },
    [onClick]
  );

  const bind = useCallback(
    (item: T) => ({
      onMouseDown: (e: React.MouseEvent) => start(e, item),
      onTouchStart: (e: React.TouchEvent) => start(e, item),
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onTouchMove: move,
      onClick: (e: React.MouseEvent) => handleClick(e, item),
      onContextMenu: (e: React.MouseEvent) => {
        if (isLongPressRef.current) {
          e.preventDefault();
        }
      },
    }),
    [start, cancel, move, handleClick]
  );

  return { bind };
}
