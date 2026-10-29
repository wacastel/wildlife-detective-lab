"""Create the printable, one-page student guide (requires ReportLab)."""

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output/pdf/Wildlife_Detective_Lab_Student_Handout.pdf"
LAB_URL = "https://wildlife-detective-lab-882550979615.us-central1.run.app/"
PHOTO_SOURCE = "https://npgallery.nps.gov/AssetDetail/575ca385-2770-4806-84ba-b7a12c918692"
WIDTH, HEIGHT = letter
GREEN = colors.HexColor("#204F3C")
INK = colors.HexColor("#202C27")
MUTED = colors.HexColor("#516057")
PALE = colors.HexColor("#F2F5F1")
RULE = colors.HexColor("#CCD6CD")


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1, invariant=1)
    pdf.setTitle("Wildlife Detective Lab | Student Handout")
    pdf.setAuthor("Wildlife Detective Lab")
    pdf.setSubject("A student guide with a QR code to the live wildlife AI lab")

    def paragraph(text, x, top, width, size=10.7, leading=14.1,
                  color=INK, font="Helvetica", align=0):
        style = ParagraphStyle("handout", fontName=font, fontSize=size,
                               leading=leading, textColor=color, alignment=align)
        item = Paragraph(text, style)
        _, height = item.wrap(width, HEIGHT)
        assert top + height <= HEIGHT - 28, (text, top, height)
        item.drawOn(pdf, x, HEIGHT - top - height)
        return height

    def text(text, x, top, size, font="Helvetica", color=INK):
        pdf.setFont(font, size)
        pdf.setFillColor(color)
        pdf.drawString(x, HEIGHT - top - size, text)

    def tab(number, title, body, top):
        pdf.setFillColor(GREEN)
        pdf.circle(47, HEIGHT - top - 9, 10, fill=1, stroke=0)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawCentredString(47, HEIGHT - top - 12.5, str(number))
        paragraph(title, 66, top, 510, size=11.6, leading=14.4,
                  font="Helvetica-Bold", color=GREEN)
        height = paragraph(body, 66, top + 20, 510, size=10.5, leading=14)
        return top + 20 + height

    # White background and restrained accents remain readable in grayscale.
    text("STUDENT EXPLORATION GUIDE", 36, 34, 9, "Helvetica-Bold", GREEN)
    text("Wildlife Detective Lab", 36, 51, 30, "Helvetica-Bold", GREEN)
    text("Explore wildlife. Test AI. Think like a scientist.", 36, 91, 12, color=MUTED)

    # Show the entire public-domain camera-trap photograph, including its overlay.
    pdf.drawImage(str(ROOT / "assets/deer_4.jpg"), 36, HEIGHT - 121 - 225,
                  width=300, height=225)
    pdf.setStrokeColor(RULE)
    pdf.setLineWidth(0.5)
    pdf.rect(36, HEIGHT - 121 - 225, 300, 225, fill=0, stroke=1)
    text("Camera-trap photo: NPS / public domain.", 36, 351, 8, color=MUTED)
    pdf.linkURL(PHOTO_SOURCE, (36, HEIGHT - 363, 336, HEIGHT - 349), relative=0)

    # Vector QR modules, black on white, with four clear modules on every side.
    widget = QrCodeWidget(LAB_URL, barLevel="M", barBorder=4)
    x0, y0, x1, y1 = widget.getBounds()
    qr_size = 180
    qr = Drawing(qr_size, qr_size, transform=[
        qr_size / (x1 - x0), 0, 0, qr_size / (y1 - y0),
        -x0 * qr_size / (x1 - x0), -y0 * qr_size / (y1 - y0),
    ])
    qr.add(widget)
    renderPDF.draw(qr, pdf, 396, HEIGHT - 119 - qr_size)
    pdf.linkURL(LAB_URL, (396, HEIGHT - 299, 576, HEIGHT - 119), relative=0)
    paragraph("Scan to open the lab", 384, 307, 204, size=12.2,
              leading=15, font="Helvetica-Bold", color=GREEN, align=TA_CENTER)
    paragraph("Use your phone's camera.<br/>No account or installation needed.",
              378, 328, 210, size=9.4, leading=13, color=MUTED, align=TA_CENTER)

    overview_bottom = 373 + paragraph(
        "Camera traps photograph animals day and night, helping scientists study wildlife "
        "and protect habitats. They produce more pictures than people can quickly review. "
        "Computer vision helps sort that evidence, but people still need to check what AI finds.",
        36, 373, 540, size=10.8, leading=14.4)
    assert overview_bottom <= 420, overview_bottom

    pdf.setStrokeColor(RULE)
    pdf.line(36, HEIGHT - 425, 576, HEIGHT - 425)
    text("EXPLORE THREE TABS", 36, 435, 9, "Helvetica-Bold", GREEN)

    end = tab(1, "How computer vision works",
              "Explore camera traps, pixels, patterns, and training. Watch a small classroom "
              "model predict, measure error, and adjust its weights using real animal photos.", 457)
    assert end <= 509, end
    end = tab(2, "Detective lab",
              "Choose an included photo or upload a permitted one. MegaDetector finds possible "
              "animals, people, and vehicles. Select an animal crop; SpeciesNet suggests its "
              "species. Compare the result with what you see.", 520)
    assert end <= 583, end
    end = tab(3, "Questions & investigations",
              "Explore common questions and test the answers with interactive examples.", 594)
    assert end <= 631, end

    pdf.setFillColor(PALE)
    pdf.roundRect(36, HEIGHT - 716, 540, 72, radius=7, fill=1, stroke=0)
    text("Your detective challenges", 49, 653, 11.2, "Helvetica-Bold", GREEN)
    for top, line in [
        (674, "1. Predict what the AI will find before revealing its result."),
        (687, "2. Add blur, darkness, or fewer pixels. What changes?"),
        (700, "3. Find a mistake or uncertain result. What evidence supports your judgment?"),
    ]:
        text(line, 49, top, 9.4)

    text("Uploads are processed on Google Cloud; the app does not save photo files.",
         36, 726, 8.2, color=MUTED)
    text("First live classification may take 1-2 minutes. AI scores are clues, not proof.",
         36, 739, 8.2, color=MUTED)
    text(LAB_URL, 36, 755, 8.4, color=GREEN)
    pdf.linkURL(LAB_URL, (36, HEIGHT - 766, 576, HEIGHT - 753), relative=0)
    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
