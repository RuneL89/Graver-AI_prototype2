from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def create_pdf(filepath, title, lines):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    c = canvas.Canvas(filepath, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 750, title)
    c.setFont("Helvetica", 12)
    y = 720
    for line in lines:
        c.drawString(72, y, line)
        y -= 18
        if y < 72:
            c.showPage()
            y = 750
    c.save()

create_pdf(
    "data/kb-business-registry/raw/business_registry_q1_2026.pdf",
    "Business Registry Extract - Q1 2026",
    [
        "Company: Oceanic Logistics Ltd",
        "Registration Number: BR-2024-00891",
        "Directors: Maria Gonzalez, Director Y (alias Jens Hansen)",
        "Address: 45 Harbor Road, Port City",
        "Status: Active",
        "",
        "Company: NorthStar Procurement Inc",
        "Registration Number: BR-2023-00412",
        "Directors: Jens Hansen, Samuel Osei",
        "Address: 88 Commerce Blvd, Capital City",
        "Status: Active",
    ]
)

create_pdf(
    "data/kb-sanctions/raw/sanctions_list_march_2026.pdf",
    "Sanctions List - March 2026",
    [
        "Entity: Jens Hansen (alias J. Hansen)",
        "Type: Individual",
        "Sanction Date: 2025-11-14",
        "Reason: Alleged involvement in procurement fraud and money laundering.",
        "Related Entities: NorthStar Procurement Inc, offshore shell companies.",
        "",
        "Entity: Global Shipping Partners",
        "Type: Corporate",
        "Sanction Date: 2025-09-02",
        "Reason: Trade restrictions violation.",
    ]
)

create_pdf(
    "data/kb-procurement/raw/procurement_contracts_2025.pdf",
    "Public Procurement Contracts - 2025",
    [
        "Contract ID: PC-2025-00442",
        "Title: Port Infrastructure Upgrade",
        "Vendor: Oceanic Logistics Ltd",
        "Value: USD 4,200,000",
        "Signatory Director: Maria Gonzalez",
        "Date: 2025-08-15",
        "",
        "Contract ID: PC-2025-00991",
        "Title: Government IT Services",
        "Vendor: NorthStar Procurement Inc",
        "Value: USD 1,850,000",
        "Signatory Director: Jens Hansen",
        "Date: 2025-10-03",
    ]
)

print("Demo PDFs created with reportlab.")
