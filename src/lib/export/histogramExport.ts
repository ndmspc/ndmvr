import {
  exportHistogramLabelStl as exportLabelWithCore,
  exportHistogramStl as exportWithCore,
} from "@ndmspc/ndmvr-core";

/** Plate text and layout options, forwarded to `exportHistogramLabelStl` in ndmvr-core. */
export interface HistogramLabelOptions {
  /** Include the histogram title. Default true. */
  title?: boolean;
  /** Include the ROOT name of the histogram. Default true. */
  name?: boolean;
  /** Include the class name (TH2D…). Default true. */
  type?: boolean;
  /** Include the axis names and titles. Default true. */
  axes?: boolean;
  /** Include the entries count. Default true. */
  stats?: boolean;
  /** Plate width in millimetres; drives the character size. Default 100. */
  maxWidthMm?: number;
  /** Maximum character height in millimetres. Default 4. */
  charHeightMm?: number;
  /** Margin around the text. Default 2. */
  paddingMm?: number;
  /** Characters per line before wrapping the title/name. Default 34. */
  wrapChars?: number;
  /** Mirror the text horizontally. Default false. */
  mirror?: boolean;
  /** Plate thickness. Default 1.5. */
  plateThicknessMm?: number;
  /** Height of the raised text. Default 0.6. */
  reliefMm?: number;
  /** Stroke width of the font. Default 0.8. */
  strokeWidthMm?: number;
  /** Voxel resolution of the plate. Default 0.3. */
  voxelMm?: number;
  /** Explicit lines instead of the generated ones. */
  lines?: string[];
}

/** Options forwarded to the ndmvr-core STL exporter. */
export interface HistogramExportOptions extends HistogramLabelOptions {
  /** Longest dimension of the model in millimetres. Default 100. */
  maxSizeMm?: number;
  /** `"auto"` writes the print model, `"mesh"` the rendered triangles. */
  mode?: "auto" | "mesh";
  /** Include the label plate (`true` or its options). */
  label?: boolean | HistogramLabelOptions;
  /** Fuse the plate and the model into one body. Default false. */
  labelFused?: boolean;
  /** Clearance between plate and model when not fused. Default 1. */
  labelGapMm?: number;
  /** TH3 connector width. Default 0.8. */
  connectorWidthMm?: number;
  /** TH3 cage edge width. Default 0.8. */
  edgeWidthMm?: number;
  /** TH3 open cage around the model. Default true. */
  cage?: boolean;
  /** TH1/2 tallest bar relative to the footprint. Default 0.6. */
  barFraction?: number;
  /** TH1/2 base plate thickness. Default 0.02. */
  baseFraction?: number;
  /** TH1 bar depth relative to the width. Default 0.4. */
  depthFraction?: number;
}

export interface HistogramSizeMm {
  x: number;
  y: number;
  z: number;
}

export type HistogramExportResult =
  | {
      ok: true;
      fileName: string;
      bytes: Uint8Array;
      triangleCount: number;
      sizeMm: HistogramSizeMm;
      /** Plate lines, when the label was written into the model file. Empty otherwise. */
      lines: string[];
    }
  | { ok: false; reason: string };

type ExportSourceGetter = () => unknown;

const sources = new Map<string, ExportSourceGetter>();

/** Called by the scene: exposes the pad's current painter to the export functions. */
export function registerHistogramExportSource(padId: string, getter: ExportSourceGetter): void {
  sources.set(padId, getter);
}

/** Removes the pad's export source (only if it is still the one that was registered). */
export function unregisterHistogramExportSource(padId: string, getter?: ExportSourceGetter): void {
  if (!getter || sources.get(padId) === getter) sources.delete(padId);
}

/** Pad ids the 3D scene currently holds a painter for — the names `exportHistogramStl` accepts. */
export function listHistogramExportPads(): string[] {
  return [...sources.keys()];
}

function resolveSource(padId: string): { source: unknown } | { reason: string } {
  const getter = sources.get(padId);
  if (!getter) return { reason: `no 3D model for pad "${padId}"` };
  const source = getter();
  if (!source) return { reason: `pad "${padId}" has no histogram yet` };
  return { source };
}

/** Writes the named pad's histogram to a binary STL for 3D printing. */
export function exportHistogramStl(
  padId: string,
  options: HistogramExportOptions = {},
): HistogramExportResult {
  const resolved = resolveSource(padId);
  if ("reason" in resolved) return { ok: false, reason: resolved.reason };

  const result = exportWithCore(resolved.source, { ...options });
  if (!result) return { ok: false, reason: `pad "${padId}" has no bins to export` };

  return {
    ok: true,
    fileName: `${result.fileStem}-${options.maxSizeMm ?? 100}mm.stl`,
    bytes: result.bytes as Uint8Array,
    triangleCount: result.triangleCount,
    sizeMm: result.sizeMm,
    lines: result.lines ?? [],
  };
}

/** Writes the named pad's label plate as a standalone STL. */
export function exportHistogramLabelStl(
  padId: string,
  options: HistogramExportOptions = {},
): HistogramExportResult {
  const resolved = resolveSource(padId);
  if ("reason" in resolved) return { ok: false, reason: resolved.reason };

  const result = exportLabelWithCore(resolved.source, { ...options });
  if (!result) return { ok: false, reason: `pad "${padId}" has nothing to put on a plate` };

  return {
    ok: true,
    fileName: `${result.fileStem}.stl`,
    bytes: result.bytes as Uint8Array,
    triangleCount: result.triangleCount,
    sizeMm: result.sizeMm,
    lines: result.lines ?? [],
  };
}
