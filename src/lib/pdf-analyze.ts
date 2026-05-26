// Client-side PDF analysis using pdfjs-dist
// Returns page count and best-effort title from PDF metadata.
import * as pdfjs from "pdfjs-dist";
// @ts-ignore
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type PdfAnalysis = {
  pageCount: number;
  title: string | null;
  author: string | null;
};

export async function analyzePdf(file: File): Promise<PdfAnalysis> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let title: string | null = null;
  let author: string | null = null;
  try {
    const meta: any = await doc.getMetadata();
    title = meta?.info?.Title || null;
    author = meta?.info?.Author || null;
  } catch {}
  return { pageCount: doc.numPages, title, author };
}
