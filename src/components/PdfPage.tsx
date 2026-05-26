import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
// @ts-ignore
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const cache = new Map<string, Promise<any>>();
function loadDoc(url: string) {
  if (!cache.has(url)) {
    cache.set(url, pdfjs.getDocument({ url, withCredentials: false }).promise);
  }
  return cache.get(url)!;
}

type Props = {
  url: string;
  pageNumber: number;
  className?: string;
  scale?: number; // canvas scale (quality)
  fit?: "contain" | "width";
};

export function PdfPage({ url, pageNumber, className, scale = 1.5, fit = "contain" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const doc = await loadDoc(url);
        if (cancelled) return;
        const pageNum = Math.min(Math.max(1, pageNumber), doc.numPages);
        const page = await doc.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        await renderTask.promise;
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Erreur de chargement");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch {}
    };
  }, [url, pageNumber, scale]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className ?? ""}`}>
      {loading && <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Chargement page {pageNumber}…</div>}
      {error && <div className="absolute inset-0 grid place-items-center text-xs text-destructive p-4 text-center">{error}</div>}
      <canvas
        ref={canvasRef}
        className={fit === "width" ? "w-full h-auto" : "max-w-full max-h-full object-contain"}
        style={{ display: error ? "none" : undefined }}
      />
    </div>
  );
}

export async function getPdfPageCount(url: string): Promise<number> {
  const doc = await loadDoc(url);
  return doc.numPages;
}
