# PDF Utilities

These scripts render Markdown to a print-ready PDF with an optional court header, and can append that PDF as a final page to an existing PDF.

## Render a court-header PDF

```bash
npm run pdf:render -- --in docs/verifier/identify_signature_algorithm_from_pubkey.v1.0.0.md --out artifacts/pdf/identify_signature_algorithm.pdf --title "Identify Signature Algorithm" --court "IN THE ____ COURT" --case "Case No. ____" --date "2026-01-11"
```

Half-sheet (for lamination / desk reference):

```bash
npm run pdf:render -- --variant half --in docs/verifier/identify_signature_algorithm_from_pubkey.v1.0.0.md --out artifacts/pdf/identify_signature_algorithm.half.pdf --title "Identify Signature Algorithm" --court "IN THE ____ COURT" --case "Case No. ____" --date "2026-01-11"
```

## Render with verification footer (SHA-256 + optional QR)

This variant prints a deterministic `SHA-256` (computed over the input Markdown + declared header fields) and a short `Doc ID` on every page, with an optional QR payload (`sha256:<hash>` by default).

```bash
npm run pdf:render:verified -- --in docs/verifier/identify_signature_algorithm_from_pubkey.v1.0.0.md --out artifacts/pdf/identify_signature_algorithm.verified.pdf --title "Identify Signature Algorithm" --court "IN THE ____ COURT" --case "Case No. ____" --date "2026-01-11"
```

## Append as final page of a transcript PDF

```bash
npm run pdf:append -- --base path/to/transcript.pdf --append artifacts/pdf/identify_signature_algorithm.pdf --out artifacts/pdf/transcript.with-final-page.pdf
```
