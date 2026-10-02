import { useLayoutEffect, useState } from 'react';
import { normalizePlotSize } from '../lib/plotSize';
import type { PlotSize } from '../lib/plotSize';

export function usePlotSize(minWidth: number, minHeight: number) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<PlotSize | null>(null);

  useLayoutEffect(() => {
    if (!node)
      return;
    const update = (rect: Pick<DOMRectReadOnly, 'width' | 'height'>) => {
      const next = normalizePlotSize(rect, minWidth, minHeight);
      if (!next)
        return;
      setSize(previous => previous?.width === next.width && previous.height === next.height ? previous : next);
    };
    update(node.getBoundingClientRect());
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect)
        update(rect);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [minHeight, minWidth, node]);

  return { ref: setNode, size };
}
