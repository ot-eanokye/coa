import { Injectable } from '@angular/core';

export interface ExtractedSpec {
  parameter: string;
  spec_range: string;
}

export interface ExtractedProduct {
  name: string;
  category: string;
  batch_no: string;
  mfg_date: string;
  exp_date: string;
  active_ingredients: string;
  specs: ExtractedSpec[];
  rawText: string;
}

/**
 * Client-side extraction of product data from an uploaded PDF spec sheet / CoA.
 * pdf.js pulls the text; a heuristic parser tuned to Ernest's CoA layout pulls
 * the fields. Extraction is best-effort — the UI lets the admin verify/edit
 * before saving.
 */
@Injectable({ providedIn: 'root' })
export class PdfExtractService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pdfjs: any = null;

  private async lib() {
    if (!this.pdfjs) {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      this.pdfjs = pdfjs;
    }
    return this.pdfjs;
  }

  async extract(file: File): Promise<ExtractedProduct> {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      throw new Error('Please upload a PDF document. (Scanned-image OCR is not supported yet.)');
    }
    const pdfjs = await this.lib();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;

    let text = '';
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += this.itemsToLines(content.items) + '\n';
    }
    if (!text.trim()) {
      throw new Error('No text found in this PDF — it may be a scanned image (OCR not supported yet).');
    }
    return { ...this.parse(text), rawText: text };
  }

  /** Reconstruct visual lines from positioned text items. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private itemsToLines(items: any[]): string {
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const it of items) {
      if (typeof it.str !== 'string' || !it.transform) continue;
      const y = Math.round(it.transform[5]);
      let key = [...rows.keys()].find((k) => Math.abs(k - y) <= 3);
      if (key === undefined) {
        key = y;
        rows.set(key, []);
      }
      rows.get(key)!.push({ x: it.transform[4], str: it.str });
    }
    return [...rows.keys()]
      .sort((a, b) => b - a) // top → bottom
      .map((y) =>
        rows
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n');
  }

  private parse(text: string): Omit<ExtractedProduct, 'rawText'> {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const joined = lines.join('\n');
    const grab = (re: RegExp) => joined.match(re)?.[1]?.trim() ?? '';

    const name = grab(/PRODUCT\s*:?\s*(.+)/i);
    const batch_no = grab(/BATCH\s*NO\.?\s*:?\s*([A-Za-z0-9\-/]+)/i);
    const mfg_date = grab(/DATE\s*OF\s*MFG\.?\s*:?\s*([0-9][0-9/\-. ]{3,})/i);
    const exp_date = grab(/DATE\s*OF\s*EXP\.?\s*:?\s*([0-9][0-9/\-. ]{3,})/i);
    const category = this.normalizeCategory(
      grab(/BULK\s*PRODUCT\s*[—\-:]*\s*([A-Za-z /]+)/i) || grab(/CATEGORY\s*:?\s*([A-Za-z]+)/i),
    );
    const active_ingredients = lines.find((l) => /^each\b/i.test(l)) ?? '';

    return { name, category, batch_no, mfg_date, exp_date, active_ingredients, specs: this.parseSpecs(lines) };
  }

  private normalizeCategory(raw: string): string {
    const s = raw.toLowerCase();
    if (s.includes('syrup')) return 'Syrup';
    if (s.includes('suspension')) return 'Suspension';
    if (s.includes('tablet')) return 'Tablet';
    if (s.includes('capsule')) return 'Capsule';
    return raw.trim();
  }

  private parseSpecs(lines: string[]): ExtractedSpec[] {
    const specRe =
      /(not\s+less\s+than\s+[\w.%]+|not\s+more\s+than\s+[\w.%]+|\d+(?:\.\d+)?\s*%?\s*[-–—]\s*\d+(?:\.\d+)?\s*%?)/i;
    const skipRe =
      /^(product|batch|date of|bulk product|certificate|appendix|pg\b|date sampled|conclusion|analysed|checked|approved|prepared|designation|name|signature|date\b|each |verification|qad|revision|test\b|no\.)/i;

    const out: ExtractedSpec[] = [];
    for (const raw of lines) {
      const cleaned = raw.replace(/^\d+\.\s*/, '').trim();
      if (!cleaned || skipRe.test(cleaned)) continue;
      const m = cleaned.match(specRe);
      if (m && m.index !== undefined && m.index >= 2) {
        const parameter = cleaned.slice(0, m.index).replace(/[\s:.\-]+$/, '').trim();
        const spec_range = cleaned.slice(m.index).trim();
        if (parameter.length >= 2 && parameter.length <= 70) {
          out.push({ parameter, spec_range });
        }
      }
    }
    return out.filter((s, i) => out.findIndex((x) => x.parameter.toLowerCase() === s.parameter.toLowerCase()) === i);
  }
}
