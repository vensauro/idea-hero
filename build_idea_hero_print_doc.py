from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path("/home/ivensauro/claraidea/idea-hero")
OUTPUT = ROOT / "deliverables" / "IDEA-HERO-QRCode-para-imprimir.docx"
QR_CODE = Path(r"C:\Users\Ivens Joris\Downloads\qrcode_idea-hero.iflowlab.com.br.png")


def apply_font(run, name="Arial", size=None, color=None, bold=None):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:ascii"), name)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = RGBColor(*color)
    if bold is not None:
        run.bold = bold


def add_centered_text(doc, text, size, color, before, after, bold=True, tracking=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.0
    run = p.add_run(text)
    apply_font(run, size=size, color=color, bold=bold)
    if tracking is not None:
        # OOXML tracking is stored in twentieths of a point.
        run._element.get_or_add_rPr().append(
            __import__("docx").oxml.OxmlElement("w:spacing")
        )
        run._element.rPr[-1].set(qn("w:val"), str(tracking))
    return p


def main():
    if not QR_CODE.is_file():
        raise FileNotFoundError(f"QR Code nao encontrado: {QR_CODE}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    section = doc.sections[0]
    # Named poster override: A4 portrait, optimized for printing in Brazil.
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)
    section.header_distance = Inches(0.3)
    section.footer_distance = Inches(0.3)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    normal.font.size = Pt(11)

    # Flyer-style opening: restrained brand blue / energetic yellow accent.
    add_centered_text(doc, "IDEA HERO", 22, (13, 63, 116), 4, 2, tracking=34)
    add_centered_text(doc, "DESAFIE SUA CRIATIVIDADE!", 29, (0, 0, 0), 2, 22)

    qr_p = doc.add_paragraph()
    qr_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    qr_p.paragraph_format.space_before = Pt(0)
    qr_p.paragraph_format.space_after = Pt(18)
    qr_p.add_run().add_picture(str(QR_CODE), width=Inches(5.55))

    add_centered_text(doc, "Aponte a câmera do seu celular", 14, (13, 63, 116), 2, 0, bold=True)

    # Footer is intentionally minimal so the page remains a clean print handout.
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.paragraph_format.space_before = Pt(0)
    footer.paragraph_format.space_after = Pt(0)
    fr = footer.add_run("IDEA HERO")
    apply_font(fr, size=8, color=(115, 115, 115), bold=True)

    doc.core_properties.title = "IDEA HERO - QR Code para imprimir"
    doc.core_properties.subject = "Cartaz com QR Code do IDEA HERO"
    doc.core_properties.author = "IDEA HERO"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
