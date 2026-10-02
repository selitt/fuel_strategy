export interface PlotSize {
  width: number;
  height: number;
}

export function normalizePlotSize(
  rect: Pick<DOMRectReadOnly, 'width' | 'height'>,
  minWidth: number,
  minHeight: number,
): PlotSize | null {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0)
    return null;
  return {
    width: Math.max(minWidth, Math.round(rect.width)),
    height: Math.max(minHeight, Math.round(rect.height)),
  };
}
