# SintraPrime PDF Watermark Options

## Option A: HTML/CSS (wkhtmltopdf / Playwright)
```html
<style>
  .sintraprime-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 420px;
    height: 420px;
    transform: translate(-50%, -50%);
    opacity: 0.12;
    z-index: 0;
  }
</style>

<img
  src="sintraprime-sigil.png"
  class="sintraprime-watermark"
  alt="SintraPrime Watermark"
/>
```
Rules:
- Opacity: 0.10–0.15
- Centered
- Never overlap header text
- Behind content (z-index: 0)

## Option B: ReportLab (deterministic)
```python
from reportlab.lib.pagesizes import LETTER

def sintraprime_watermark(c, sigil_path="sintraprime-sigil.png"):
    width, height = LETTER
    size = 360
    c.saveState()
    c.setFillAlpha(0.12)
    c.drawImage(
        sigil_path,
        (width - size) / 2,
        (height - size) / 2,
        width=size,
        height=size,
        mask="auto"
    )
    c.restoreState()
```
Call before body content on each page; does not affect layout.
