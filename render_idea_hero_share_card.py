from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path("/home/ivensauro/claraidea/idea-hero")
PDF = ROOT / "deliverables" / "IDEA-HERO-card-para-imprimir.pdf"
OUT = ROOT / "tmp" / "pdfs" / "idea-hero-share-card-page-1.png"


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(PDF)
    if len(document) != 1:
        raise ValueError(f"Esperada 1 pagina; encontradas {len(document)}")
    bitmap = document[0].render(scale=2.0)
    bitmap.to_pil().save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
