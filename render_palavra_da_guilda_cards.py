from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path("/home/ivensauro/claraidea/idea-hero")
PDF = ROOT / "deliverables" / "Palavra-da-Guilda-3-cards-QR.pdf"
OUT = ROOT / "tmp" / "pdfs" / "palavra-da-guilda"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(PDF)
    if len(document) != 3:
        raise ValueError(f"Esperadas 3 paginas; encontradas {len(document)}")
    for index, page in enumerate(document):
        page.render(scale=2.0).to_pil().save(OUT / f"page-{index + 1}.png")
    print(OUT)


if __name__ == "__main__":
    main()
