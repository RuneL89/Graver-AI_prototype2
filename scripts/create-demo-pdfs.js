import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function createPDF(filePath, title, lines) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown();
  doc.fontSize(12);
  for (const line of lines) {
    doc.text(line);
  }
  doc.end();
}

// Business Registry PDF
createPDF(
  'data/kb-business-registry/raw/business_registry_q1_2026.pdf',
  'Business Registry Extract - Q1 2026',
  [
    'Company: Oceanic Logistics Ltd',
    'Registration Number: BR-2024-00891',
    'Directors: Maria Gonzalez, Director Y (alias Jens Hansen)',
    'Address: 45 Harbor Road, Port City',
    'Status: Active',
    '',
    'Company: NorthStar Procurement Inc',
    'Registration Number: BR-2023-00412',
    'Directors: Jens Hansen, Samuel Osei',
    'Address: 88 Commerce Blvd, Capital City',
    'Status: Active',
  ]
);

// Sanctions PDF
createPDF(
  'data/kb-sanctions/raw/sanctions_list_march_2026.pdf',
  'Sanctions List - March 2026',
  [
    'Entity: Jens Hansen (alias J. Hansen)',
    'Type: Individual',
    'Sanction Date: 2025-11-14',
    'Reason: Alleged involvement in procurement fraud and money laundering.',
    'Related Entities: NorthStar Procurement Inc, offshore shell companies.',
    '',
    'Entity: Global Shipping Partners',
    'Type: Corporate',
    'Sanction Date: 2025-09-02',
    'Reason: Trade restrictions violation.',
  ]
);

// Procurement PDF
createPDF(
  'data/kb-procurement/raw/procurement_contracts_2025.pdf',
  'Public Procurement Contracts - 2025',
  [
    'Contract ID: PC-2025-00442',
    'Title: Port Infrastructure Upgrade',
    'Vendor: Oceanic Logistics Ltd',
    'Value: USD 4,200,000',
    'Signatory Director: Maria Gonzalez',
    'Date: 2025-08-15',
    '',
    'Contract ID: PC-2025-00991',
    'Title: Government IT Services',
    'Vendor: NorthStar Procurement Inc',
    'Value: USD 1,850,000',
    'Signatory Director: Jens Hansen',
    'Date: 2025-10-03',
  ]
);

console.log('Demo PDFs created.');
