import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

// Renders a document's rendered content into a simple .docx buffer.
// Deliberately not cached/stored like the PDF (no schema column for a second
// file-key) — content is an immutable snapshot, so re-rendering per download
// is cheap and this stays a single, no-migration-needed function.
export async function render_document_docx(doc) {
  const paragraphs = [
    new Paragraph({ text: doc.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${doc.category?.name || ''} · ${doc.type?.name || ''} · Status: ${doc.status}`,
          italics: true,
          color: '666666',
          size: 18,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    ...doc.content.split('\n\n').map((block) => new Paragraph({ text: block })),
  ];

  if (doc.signatures?.some((s) => s.signed_at)) {
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: 'Signatures', heading: HeadingLevel.HEADING_2 }));
    for (const sig of doc.signatures) {
      if (!sig.signed_at) continue;
      paragraphs.push(new Paragraph({ text: `${sig.signer_role} — signed ${new Date(sig.signed_at).toLocaleString()}` }));
    }
  }

  const document = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(document);
}
