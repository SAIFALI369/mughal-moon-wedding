"""Run with Pillow to regenerate lightweight WebP assets and the share card."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
for source in (root / "src/assets").glob("*.jpg"):
    image = Image.open(source)
    image.thumbnail((1600,1600))
    image.save(source.with_suffix(".webp"), "WEBP", quality=80, method=6)
image = Image.new("RGB", (1200,630), "#173e35")
draw = ImageDraw.Draw(image)
for inset in [26, 35]: draw.rounded_rectangle((inset,inset,1200-inset,630-inset), radius=32, outline="#a8c3ac", width=1)
font_root = Path("/usr/share/fonts/truetype/dejavu")
def font(size, serif=False): return ImageFont.truetype(str(font_root / ("DejaVuSerif.ttf" if serif else "DejaVuSans.ttf")),size)
def text(y, value, size, fill="#fff6e7", serif=False):
    draw.text((600,y), value, fill=fill, font=font(size,serif), anchor="mt")
text(112, "TOGETHER, A BEAUTIFUL BEGINNING", 20, "#bcd9c9")
text(219, "Mohsin & Simran", 76, serif=True)
text(340, "You are warmly invited", 30, serif=True)
draw.line((480,410,720,410),fill="#bcd9c9",width=1)
text(450, "22–23 NOVEMBER 2026  ·  NEW DELHI", 22, "#bcd9c9")
text(506, "NIKAH  /  BARAT  /  WALIMA", 16, "#bcd9c9")
image.save(root / "public/social-preview.jpg",quality=88,optimize=True)
