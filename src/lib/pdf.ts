// pdf-parse is a CJS module; dynamic require keeps Next.js happy.
// We declare a tiny inline type to avoid pulling types into client bundles.

type PdfParseFn = (buf: Buffer) => Promise<{ text: string; numpages: number }>;

let _pdfParse: PdfParseFn | null = null;
async function getPdfParse(): Promise<PdfParseFn> {
  if (!_pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _pdfParse = require("pdf-parse") as PdfParseFn;
  }
  return _pdfParse!;
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  const pdfParse = await getPdfParse();
  const result = await pdfParse(buf);
  return result.text || "";
}
