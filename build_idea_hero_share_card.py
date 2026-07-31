from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path("/home/ivensauro/claraidea/idea-hero")
OUTPUT = ROOT / "deliverables" / "IDEA-HERO-card-para-imprimir.pdf"
QR_CODE = Path(r"C:\Users\Ivens Joris\Downloads\qrcode_idea-hero.iflowlab.com.br.png")

PAPER = HexColor("#FFF9ED")
INK = HexColor("#292332")
PINK = HexColor("#EC4D76")
TEAL = HexColor("#55D3CE")
SUN = HexColor("#FFD833")
PALE_PINK = HexColor("#F9DDE6")
PALE_TEAL = HexColor("#D8F6F2")
CARD = HexColor("#FFFDF8")
MUTED = HexColor("#69616D")


def centered(c, text, y, size, font="Helvetica-Bold", color=INK):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawCentredString(A4[0] / 2, y, text)


def draw_spark(c, x, y, size):
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(4)
    c.setLineCap(1)
    c.line(x - size, y, x + size, y)
    c.line(x, y - size, x, y + size)
    c.line(x - size * 0.68, y - size * 0.68, x + size * 0.68, y + size * 0.68)
    c.line(x - size * 0.68, y + size * 0.68, x + size * 0.68, y - size * 0.68)
    c.restoreState()


def draw_dot_grid(c, width, height):
    c.saveState()
    c.setFillColor(HexColor("#EEDFD3"))
    for x in range(22, int(width), 22):
        for y in range(22, int(height), 22):
            c.circle(x, y, 0.7, stroke=0, fill=1)
    c.restoreState()


def main():
    if not QR_CODE.is_file():
        raise FileNotFoundError(f"QR Code nao encontrado: {QR_CODE}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    width, height = A4
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("IDEA HERO - Card para imprimir")
    c.setAuthor("IDEA HERO")
    c.setSubject("Card de convite com QR Code")

    # Background follows the final share-card palette: warm paper, dotted texture,
    # oversized teal/sun shapes and a heavy ink shadow.
    c.setFillColor(PAPER)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    draw_dot_grid(c, width, height)
    c.setFillColor(TEAL)
    c.circle(width + 35, height - 34, 126, stroke=0, fill=1)
    c.setFillColor(SUN)
    c.circle(-30, 12, 126, stroke=0, fill=1)
    c.setFillColor(PINK)
    c.circle(72, height - 83, 20, stroke=0, fill=1)
    c.setFillColor(PALE_TEAL)
    c.circle(width - 60, 130, 28, stroke=0, fill=1)

    # The central "share card" uses the same high-contrast rounded card and shadow.
    card_x, card_y, card_w, card_h = 47, 78, width - 94, height - 156
    c.setFillColor(INK)
    c.roundRect(card_x + 12, card_y - 12, card_w, card_h, 30, stroke=0, fill=1)
    c.setFillColor(CARD)
    c.setStrokeColor(INK)
    c.setLineWidth(2.2)
    c.roundRect(card_x, card_y, card_w, card_h, 30, stroke=1, fill=1)

    # Brand pill and hand-drawn spark.
    pill_x, pill_y, pill_w, pill_h = card_x + 38, card_y + card_h - 78, 156, 38
    c.setFillColor(PINK)
    c.roundRect(pill_x, pill_y, pill_w, pill_h, 19, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(pill_x + pill_w / 2, pill_y + 12, "IDEA HERO")
    draw_spark(c, card_x + card_w - 77, card_y + card_h - 58, 24)

    centered(c, "DESAFIE", card_y + card_h - 137, 37)
    centered(c, "SUA CRIATIVIDADE!", card_y + card_h - 181, 34)
    c.setFillColor(PINK)
    c.roundRect(width / 2 - 118, card_y + card_h - 202, 236, 11, 5.5, stroke=0, fill=1)

    centered(c, "UMA AVENTURA COLABORATIVA PARA CRIAR IDEIAS", card_y + card_h - 237, 10, color=MUTED)

    # QR panel: generous quiet zone preserves reliable phone scanning after printing.
    panel_size = 330
    panel_x = (width - panel_size) / 2
    panel_y = card_y + 140
    c.setFillColor(PALE_PINK)
    c.roundRect(panel_x - 8, panel_y - 8, panel_size + 16, panel_size + 16, 24, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(INK)
    c.setLineWidth(2.2)
    c.roundRect(panel_x, panel_y, panel_size, panel_size, 20, stroke=1, fill=1)
    qr_size = 292
    c.drawImage(
        str(QR_CODE),
        panel_x + (panel_size - qr_size) / 2,
        panel_y + (panel_size - qr_size) / 2,
        width=qr_size,
        height=qr_size,
        mask="auto",
        preserveAspectRatio=True,
        anchor="c",
    )

    # Bottom call-to-action mirrors the compact stat bands in the final share card.
    band_x, band_y, band_w, band_h = card_x + 42, card_y + 43, card_w - 84, 52
    c.setFillColor(TEAL)
    c.roundRect(band_x, band_y, band_w, band_h, 18, stroke=0, fill=1)
    centered(c, "APONTE A CÂMERA E ENTRE NA AVENTURA", band_y + 18, 15)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, 33, "IDEA HERO")
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
