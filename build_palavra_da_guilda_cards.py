from pathlib import Path
import re

from PIL import Image, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path("/home/ivensauro/claraidea/idea-hero")
OUTPUT = ROOT / "deliverables" / "Palavra-da-Guilda-3-cards-QR.pdf"
SOURCE_ART = ROOT / "deliverables" / "guild-dungeon-pixelart-source.png"
BANNER_ART = ROOT / "deliverables" / "guild-dungeon-pixelart.png"
QR_CODES = [
    Path(r"C:\Users\Ivens Joris\Downloads\qrcode (1).svg"),
    Path(r"C:\Users\Ivens Joris\Downloads\qrcode (2).svg"),
    Path(r"C:\Users\Ivens Joris\Downloads\qrcode (3).svg"),
]

PAPER = HexColor("#F7EDDC")
INK = HexColor("#171321")
LINE = HexColor("#33293D")
WHITE = HexColor("#FFFFFF")
MUTED = HexColor("#665A6A")
ACCENTS = [HexColor("#C33BE2"), HexColor("#F46D32"), HexColor("#45C9C6")]
ROMAN = ["I", "II", "III"]


def make_banner():
    """Prepare a compact crop for the top of every print card."""
    if not SOURCE_ART.is_file():
        raise FileNotFoundError(f"Arte pixelada nao encontrada: {SOURCE_ART}")
    image = Image.open(SOURCE_ART).convert("RGB")
    banner = ImageOps.fit(image, (1800, 840), method=Image.Resampling.LANCZOS, centering=(0.5, 0.34))
    banner.save(BANNER_ART, optimize=True)


def load_qr_rectangles(path: Path):
    if not path.is_file():
        raise FileNotFoundError(f"QR Code nao encontrado: {path}")
    source = path.read_text(encoding="utf-8")
    # The supplied SVGs encode the QR matrix as concise horizontal rectangles.
    # Drawing those rectangles directly keeps the QR Code vector-sharp in the PDF.
    matches = re.findall(
        r"M\s*(-?\d+)\s*,?\s*(-?\d+)\s*h\s*(-?\d+)\s*v\s*(-?\d+)\s*H\s*(-?\d+)z",
        source,
    )
    rects = [(int(x), int(y), int(w), int(h)) for x, y, w, h, _ in matches]
    if len(rects) < 90:
        raise ValueError(f"Nao foi possivel interpretar o QR Code: {path}")
    return rects


def draw_qr(c, rectangles, x, y, size):
    """Draw a 49 x 49 SVG QR matrix in the PDF coordinate system."""
    scale = size / 49
    c.saveState()
    c.setFillColor(HexColor("#000000"))
    for module_x, module_y, module_w, module_h in rectangles:
        # The SVG starts with one white 49x49 background rectangle. The panel
        # behind the QR is already white, so only the black matrix modules draw.
        if module_w == 49 and module_h == 49:
            continue
        c.rect(
            x + module_x * scale,
            y + (49 - module_y - module_h) * scale,
            module_w * scale,
            module_h * scale,
            stroke=0,
            fill=1,
        )
    c.restoreState()


def draw_pixel_orb(c, x, y, color):
    c.saveState()
    c.setFillColor(color)
    c.rect(x, y + 6, 16, 16, stroke=0, fill=1)
    c.rect(x + 6, y, 16, 28, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.rect(x + 7, y + 15, 5, 5, stroke=0, fill=1)
    c.restoreState()


def draw_progress(c, x, y, fragment, accent):
    c.setFont("Courier-Bold", 8)
    c.setFillColor(MUTED)
    c.drawString(x, y + 5, "ORDEM DA MISSAO")
    start = x + 133
    for index in range(3):
        active = index == fragment
        c.setFillColor(accent if active else HexColor("#D4C7B7"))
        c.circle(start + index * 33, y + 8, 10, stroke=0, fill=1)
        c.setFillColor(INK if active else MUTED)
        c.setFont("Courier-Bold", 9)
        c.drawCentredString(start + index * 33, y + 4.5, str(index + 1))
        if index < 2:
            c.setStrokeColor(HexColor("#B9A997"))
            c.setLineWidth(1.5)
            c.line(start + index * 33 + 11, y + 8, start + (index + 1) * 33 - 11, y + 8)


def draw_card(c, fragment, qr_rectangles):
    width, height = A4
    accent = ACCENTS[fragment]

    c.setFillColor(INK)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(HexColor("#211827"))
    c.circle(width + 18, height + 16, 165, stroke=0, fill=1)
    c.setFillColor(accent)
    c.circle(width - 26, height - 42, 84, stroke=0, fill=1)
    c.setFillColor(HexColor("#0D0A13"))
    c.circle(-18, 4, 130, stroke=0, fill=1)

    # One full A4 card per page, giving each QR enough size for a reliable scan.
    card_x, card_y, card_w, card_h = 38, 32, width - 76, height - 64
    c.setFillColor(HexColor("#07050A"))
    c.roundRect(card_x + 10, card_y - 10, card_w, card_h, 26, stroke=0, fill=1)
    c.setFillColor(PAPER)
    c.setStrokeColor(HexColor("#0A0710"))
    c.setLineWidth(2.5)
    c.roundRect(card_x, card_y, card_w, card_h, 26, stroke=1, fill=1)

    # Header banner.
    header_y = card_y + card_h - 76
    c.setFillColor(INK)
    c.roundRect(card_x + 24, header_y, card_w - 48, 48, 14, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Courier-Bold", 15)
    c.drawString(card_x + 43, header_y + 17, "A PALAVRA DA GUILDA")
    draw_pixel_orb(c, card_x + card_w - 62, header_y + 10, accent)

    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 31)
    c.drawString(card_x + 34, header_y - 45, f"FRAGMENTO {ROMAN[fragment]}")
    c.setFont("Courier-Bold", 10)
    c.setFillColor(MUTED)
    c.drawString(card_x + 36, header_y - 62, f"ARTEFATO {fragment + 1} DE 3  /  TRILHA-I")

    # Pixel-art scene, intentionally separate from the QR Code so its contrast stays perfect.
    banner_x, banner_y, banner_w, banner_h = card_x + 28, header_y - 253, card_w - 56, 154
    c.setFillColor(INK)
    c.roundRect(banner_x + 5, banner_y - 5, banner_w, banner_h, 16, stroke=0, fill=1)
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(banner_x, banner_y, banner_w, banner_h, 16)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(str(BANNER_ART), banner_x, banner_y, banner_w, banner_h, mask="auto")
    c.restoreState()
    c.setStrokeColor(INK)
    c.setLineWidth(2)
    c.roundRect(banner_x, banner_y, banner_w, banner_h, 16, stroke=1, fill=0)

    # QR panel with a wide white quiet zone; the QR itself stays vector native.
    panel_size = 263
    panel_x = (width - panel_size) / 2
    panel_y = card_y + 159
    c.setFillColor(accent)
    c.roundRect(panel_x - 9, panel_y - 9, panel_size + 18, panel_size + 18, 22, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setStrokeColor(INK)
    c.setLineWidth(2.4)
    c.roundRect(panel_x, panel_y, panel_size, panel_size, 18, stroke=1, fill=1)
    qr_size = 231
    draw_qr(
        c,
        qr_rectangles,
        panel_x + (panel_size - qr_size) / 2,
        panel_y + (panel_size - qr_size) / 2,
        qr_size,
    )

    c.setFillColor(INK)
    c.setFont("Courier-Bold", 11)
    c.drawCentredString(width / 2, panel_y - 24, "ESCANEIE PARA COLETAR O FRAGMENTO")

    draw_progress(c, card_x + 42, card_y + 67, fragment, accent)


def main():
    make_banner()
    qr_rectangles = [load_qr_rectangles(path) for path in QR_CODES]
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("A Palavra da Guilda - 3 Cards QR")
    c.setAuthor("Trilha-i")
    c.setSubject("Cards de caça ao tesouro com QR Codes em ordem")
    for index, rectangles in enumerate(qr_rectangles):
        draw_card(c, index, rectangles)
        c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
