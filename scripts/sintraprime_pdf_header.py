"""
SintraPrime PDF Header Generator — ReportLab Drop-In Function

Usage:
    from sintraprime_pdf_header import add_sintraprime_header
    
    # In your ReportLab PDF generation code:
    story = []
    
    # Add SintraPrime header
    add_sintraprime_header(
        story,
        mode="ACTIVE",  # or "OBSERVE ONLY", "REFUSAL ISSUED", "AUDIT RESPONSE"
        scope="Governance Review",
        authority_basis="Documentary Evidence Only",
        icon_path="brand/sintraprime/sintraprime-sigil-48.png"
    )
    
    # Add your content
    story.append(Paragraph("Your document content here", normal_style))
    
    # Build PDF
    doc.build(story)

Installation:
    pip install reportlab pillow
"""

from reportlab.lib import colors
from reportlab.lib.units import mm, pt
from reportlab.platypus import Table, TableStyle, Spacer, Image, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os


def add_sintraprime_header(
    story,
    mode="ACTIVE",
    scope="Declared",
    authority_basis="Documentary Evidence Only",
    icon_path=None,
    icon_width=12*mm,
    icon_height=12*mm
):
    """
    Add a SintraPrime Mode header block to a ReportLab story.
    
    Args:
        story (list): ReportLab story/flowable list to append header to
        mode (str): Mode status (ACTIVE, OBSERVE ONLY, REFUSAL ISSUED, AUDIT RESPONSE)
        scope (str): Scope description (e.g., "Governance Review")
        authority_basis (str): Authority (e.g., "Documentary Evidence Only")
        icon_path (str): Path to sigil PNG (default: uses placeholder)
        icon_width (float): Icon width in points (default: 12mm)
        icon_height (float): Icon height in points (default: 12mm)
    """
    
    # Define styles
    mode_title_style = ParagraphStyle(
        'ModeTitleStyle',
        fontName='Courier-Bold',
        fontSize=12,
        textColor=colors.HexColor('#0B0E14'),
        leading=14,
        spaceAfter=4
    )
    
    mode_subtitle_style = ParagraphStyle(
        'ModeSubtitleStyle',
        fontName='Courier',
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        leading=11,
        spaceAfter=2
    )
    
    # Mode title
    mode_title = f"🜂 SINTRAPRIME MODE — {mode}"
    
    # Governance line
    governance_line = f"Governance: Locked · Scope: {scope} · Execution: Constrained"
    
    # Authority line
    authority_line = f"Authority Basis: {authority_basis}"
    
    # Create text block
    text_elements = [
        Paragraph(mode_title, mode_title_style),
        Paragraph(governance_line, mode_subtitle_style),
        Paragraph(authority_line, mode_subtitle_style)
    ]
    
    # If icon exists, create a table with icon + text
    if icon_path and os.path.exists(icon_path):
        try:
            icon_image = Image(icon_path, width=icon_width, height=icon_height)
            
            # Create 2-column table: [icon] [text]
            header_data = [
                [
                    icon_image,
                    Table(
                        [[elem] for elem in text_elements],
                        colWidths=[150*mm],
                        hAlign='LEFT'
                    )
                ]
            ]
            
            header_table = Table(
                header_data,
                colWidths=[icon_width + 6*mm, None],
                hAlign='LEFT'
            )
            
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            
            story.append(header_table)
            
        except Exception as e:
            # If icon fails, just use text
            print(f"Warning: Could not load icon from {icon_path}: {e}")
            for elem in text_elements:
                story.append(elem)
    else:
        # No icon, just text
        for elem in text_elements:
            story.append(elem)
    
    # Add horizontal rule (border line)
    rule_table = Table(
        [['']],
        colWidths=[None],
        hAlign='CENTRE'
    )
    
    rule_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#E9E4D8')),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
    ]))
    
    story.append(rule_table)
    
    # Add spacing after header
    story.append(Spacer(1, 16*mm))


def add_sintraprime_watermark(
    canvas,
    page_width,
    page_height,
    icon_path=None,
    opacity=0.1
):
    """
    Add optional watermark (background sigil) to a PDF page.
    
    Usage:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
        c = canvas.Canvas("output.pdf", pagesize=letter)
        
        # Draw normal content
        c.drawString(100, 750, "Your content here")
        
        # Add watermark
        add_sintraprime_watermark(
            c,
            letter[0],
            letter[1],
            icon_path="brand/sintraprime/sintraprime-sigil-128.png",
            opacity=0.15
        )
        
        c.save()
    
    Args:
        canvas: ReportLab canvas object
        page_width (float): Page width in points
        page_height (float): Page height in points
        icon_path (str): Path to sigil PNG
        opacity (float): Watermark opacity (0.0–1.0, default 0.1)
    """
    
    if not icon_path or not os.path.exists(icon_path):
        return
    
    try:
        # Save current state
        canvas.saveState()
        
        # Set opacity
        canvas.setFillAlpha(opacity)
        canvas.setStrokeAlpha(opacity)
        
        # Center watermark on page
        icon_size = 180  # points
        x = (page_width - icon_size) / 2
        y = (page_height - icon_size) / 2
        
        # Draw image
        canvas.drawImage(
            icon_path,
            x, y,
            width=icon_size,
            height=icon_size,
            preserveAspectRatio=True
        )
        
        # Restore state
        canvas.restoreState()
        
    except Exception as e:
        print(f"Warning: Could not add watermark: {e}")


# ============================================================================
# EXAMPLE: Full PDF Generation with SintraPrime Header
# ============================================================================

def generate_sintraprime_pdf(
    output_filename,
    title,
    content_paragraphs,
    mode="ACTIVE",
    scope="Analysis",
    operator="SintraPrime Agent",
    icon_path="brand/sintraprime/sintraprime-sigil-48.png"
):
    """
    Generate a complete PDF with SintraPrime Mode header and content.
    
    Args:
        output_filename (str): Output PDF file path
        title (str): Document title
        content_paragraphs (list): List of text strings to include in content
        mode (str): Mode status
        scope (str): Scope description
        operator (str): Operator name
        icon_path (str): Path to sigil
    
    Example:
        generate_sintraprime_pdf(
            "governance-review.pdf",
            "Governance Review Report",
            ["This is the first paragraph.", "This is the second paragraph."],
            mode="OBSERVE ONLY",
            scope="Governance Audit",
            operator="SintraPrime Agent"
        )
    """
    
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY
    
    # Create PDF doc
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=12*mm,
        bottomMargin=12*mm
    )
    
    story = []
    
    # Add SintraPrime header
    add_sintraprime_header(
        story,
        mode=mode,
        scope=scope,
        authority_basis="Documentary Evidence Only",
        icon_path=icon_path
    )
    
    # Add title
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0B0E14'),
        spaceAfter=12,
        spaceBefore=0
    )
    
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 6*mm))
    
    # Add content paragraphs
    content_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )
    
    for paragraph_text in content_paragraphs:
        story.append(Paragraph(paragraph_text, content_style))
    
    # Add footer with metadata
    story.append(Spacer(1, 12*mm))
    
    footer_style = ParagraphStyle(
        'Footer',
        fontName='Courier',
        fontSize=8,
        textColor=colors.HexColor('#999999'),
        spaceAfter=0
    )
    
    story.append(Paragraph(f"Generated by: {operator}", footer_style))
    story.append(Paragraph(f"Mode: {mode} | Auditable | Reproducible", footer_style))
    
    # Build PDF
    doc.build(story)
    
    print(f"✓ PDF generated: {output_filename}")


# ============================================================================
# CLI USAGE (if run as script)
# ============================================================================

if __name__ == "__main__":
    """
    Quick test: generate a sample PDF with SintraPrime header.
    
    Usage:
        python sintraprime_pdf_header.py
    """
    
    sample_content = [
        "This is a sample governance document generated under SintraPrime Mode.",
        "All content herein is auditable, reproducible, and declarable.",
        "The Mode Declaration header signals governance constraints and authority basis.",
        "For regulatory inquiries, see OPERATOR_LEDGER for session metadata."
    ]
    
    generate_sintraprime_pdf(
        "sample_sintraprime_output.pdf",
        "Sample SintraPrime Governance Document",
        sample_content,
        mode="ACTIVE",
        scope="Documentation Test",
        operator="SintraPrime Agent"
    )
    
    print("\n✓ Sample PDF created: sample_sintraprime_output.pdf")
    print("✓ Header includes sigil + mode declaration")
    print("✓ Use this as a template for your PDF generation")
