from docx import Document
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
import io

def create_docx(project) -> io.BytesIO:
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    
    doc = Document()
    
    # Set default font for the document
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    
    # Add title with custom formatting
    title = doc.add_heading(project.title, 0)
    title_run = title.runs[0]
    title_run.font.name = 'Calibri'
    title_run.font.size = Pt(24)
    title_run.font.color.rgb = RGBColor(31, 78, 120)  # Professional blue
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Add a subtle separator
    doc.add_paragraph('_' * 80)
    
    for section in sorted(project.sections, key=lambda x: x.orderIndex):
        # Add section heading with consistent formatting
        heading = doc.add_heading(section.title, level=1)
        heading_run = heading.runs[0]
        heading_run.font.name = 'Calibri'
        heading_run.font.size = Pt(16)
        heading_run.font.color.rgb = RGBColor(68, 114, 196)  # Medium blue
        heading.space_before = Pt(12)
        heading.space_after = Pt(6)
        
        # Handle content with proper paragraph breaks and formatting
        content = section.content or "No content generated yet."
        
        # Split on double newlines for paragraphs
        paragraphs = content.split('\n\n')
        
        for para_text in paragraphs:
            para_text = para_text.strip()
            if para_text:
                # Check if it's a bullet point
                if para_text.startswith(('•', '-', '*')):
                    # Handle as bullet list
                    lines = para_text.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line:
                            bullet_text = line.lstrip('•-*').strip()
                            if bullet_text:
                                p = doc.add_paragraph(bullet_text, style='List Bullet')
                                p.paragraph_format.left_indent = Inches(0.25)
                                p.paragraph_format.space_after = Pt(6)
                else:
                    # Regular paragraph
                    p = doc.add_paragraph(para_text)
                    p.paragraph_format.space_after = Pt(10)
                    p.paragraph_format.line_spacing = 1.15
                    p.paragraph_format.first_line_indent = Inches(0)
                    
                    # Justify text for professional look
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream

def parse_slide_content(content: str) -> dict:
    """Parse the structured slide content format"""
    result = {
        'title': '',
        'bullets': [],
        'image_suggestion': ''
    }

    if not content:
        return result

    lines = content.split('\n')
    in_content_section = False

    # Keywords that indicate speaker notes (to be filtered out)
    speaker_note_keywords = ['SPEAKER_NOTES:', 'NOTES:', 'SPEAKER:', 'NOTE:']

    for line in lines:
        line = line.strip()

        # Skip any lines that are speaker notes
        if any(line.upper().startswith(keyword) for keyword in speaker_note_keywords):
            in_content_section = False
            continue

        if line.startswith('TITLE:'):
            result['title'] = line.replace('TITLE:', '').strip()
        elif line.startswith('CONTENT:'):
            in_content_section = True
        elif line.startswith('IMAGE_SUGGESTION:'):
            result['image_suggestion'] = line.replace('IMAGE_SUGGESTION:', '').strip()
            in_content_section = False
        elif in_content_section and line:
            # Extract bullet points
            bullet = line.lstrip('•-*').strip()
            if bullet:
                result['bullets'].append(bullet)

    return result

def create_pptx(project) -> io.BytesIO:
    prs = Presentation()

    # Set slide size to widescreen (16:9)
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)

    # Title Slide
    title_slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(title_slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = project.title
    subtitle.text = "AI-Generated Presentation"

    # Content Slides
    for section in sorted(project.sections, key=lambda x: x.orderIndex):
        # Use blank layout for more control
        blank_layout = prs.slide_layouts[6]  # Blank layout
        slide = prs.slides.add_slide(blank_layout)

        # Parse the structured content
        parsed = parse_slide_content(section.content or "")

        # Add title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.8)
        )
        title_frame = title_box.text_frame
        title_frame.text = parsed['title'] or section.title
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(32)
        title_para.font.bold = True
        title_para.font.name = 'Calibri'

        # Determine layout based on whether there's an image suggestion
        if parsed['image_suggestion']:
            # Two-column layout: content on left, image placeholder on right
            content_left = Inches(0.5)
            content_top = Inches(1.5)
            content_width = Inches(5)
            content_height = Inches(3.5)

            # Add content textbox
            content_box = slide.shapes.add_textbox(
                content_left, content_top, content_width, content_height
            )
            content_frame = content_box.text_frame
            content_frame.word_wrap = True

            # Add bullet points
            for i, bullet in enumerate(parsed['bullets']):
                if i == 0:
                    p = content_frame.paragraphs[0]
                else:
                    p = content_frame.add_paragraph()
                p.text = bullet
                p.level = 0
                p.font.size = Pt(18)
                p.font.name = 'Calibri'
                p.space_before = Pt(6)

            # Add image placeholder
            img_left = Inches(6)
            img_top = Inches(1.5)
            img_width = Inches(3.5)
            img_height = Inches(3.5)

            img_placeholder = slide.shapes.add_textbox(
                img_left, img_top, img_width, img_height
            )
            img_frame = img_placeholder.text_frame
            img_frame.text = f"📷 Image:\n{parsed['image_suggestion']}"
            img_para = img_frame.paragraphs[0]
            img_para.font.size = Pt(14)
            img_para.font.italic = True
            img_para.alignment = 1  # Center

            # Add border to image placeholder
            line = img_placeholder.line
            line.color.rgb = RGBColor(200, 200, 200)
            line.width = Pt(1)
        else:
            # Full-width content layout
            content_left = Inches(1)
            content_top = Inches(1.5)
            content_width = Inches(8)
            content_height = Inches(3.5)

            content_box = slide.shapes.add_textbox(
                content_left, content_top, content_width, content_height
            )
            content_frame = content_box.text_frame
            content_frame.word_wrap = True

            # Add bullet points
            for i, bullet in enumerate(parsed['bullets']):
                if i == 0:
                    p = content_frame.paragraphs[0]
                else:
                    p = content_frame.add_paragraph()
                p.text = bullet
                p.level = 0
                p.font.size = Pt(20)
                p.font.name = 'Calibri'
                p.space_before = Pt(8)

    file_stream = io.BytesIO()
    prs.save(file_stream)
    file_stream.seek(0)
    return file_stream
