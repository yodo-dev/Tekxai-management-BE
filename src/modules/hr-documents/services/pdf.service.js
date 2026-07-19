import PDFDocument from 'pdfkit';
import { randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { upload_buffer } from '../../storage/storage.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Renders a document's rendered content into a simple, readable PDF buffer.
// No layout templating — the placeholder engine already produced the final
// text, this just paginates it.
export function render_document_pdf(doc) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 56 });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.font('Helvetica-Bold').fontSize(16).text(doc.title, { align: 'left' });
    pdf.moveDown(0.3);
    pdf.font('Helvetica').fontSize(9).fillColor('#666666')
      .text(`${doc.category?.name || ''} · ${doc.type?.name || ''} · Status: ${doc.status}`);
    pdf.moveDown(1);
    pdf.fillColor('#000000').font('Helvetica').fontSize(11).text(doc.content, { align: 'left', lineGap: 4 });

    if (doc.signatures?.length) {
      pdf.moveDown(2);
      pdf.font('Helvetica-Bold').fontSize(11).text('Signatures');
      pdf.moveDown(0.5);
      for (const sig of doc.signatures) {
        if (!sig.signed_at) continue;
        pdf.font('Helvetica').fontSize(10).text(`${sig.signer_role} — signed ${new Date(sig.signed_at).toLocaleString()}`);
      }
    }

    pdf.end();
  });
}

// Uploads a generated PDF buffer via the shared storage service, falling
// back to local disk (served via /uploads) when no S3 credentials are set —
// same fallback pattern as /storage/upload.
export async function store_document_pdf(doc_id, buffer) {
  const key = `hr-documents/${doc_id}/${Date.now()}_${randomBytes(6).toString('hex')}.pdf`;
  let file_url = null;
  try {
    file_url = await upload_buffer(key, buffer, 'application/pdf');
  } catch {
    file_url = null; // misconfigured/unreachable S3 — fall back to local disk below
  }
  if (!file_url) {
    fs.writeFileSync(path.join(UPLOAD_DIR, path.basename(key)), buffer);
  }
  return key;
}
