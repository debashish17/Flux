from docx import Document
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
import io
import re

def parse_markdown_line(paragraph, text):
    """
    Parse a line of markdown text and add formatted runs to a paragraph
    Handles: **bold**, *italic*, `code`, [links](url)
    """
    from docx.shared import RGBColor

    # Pattern to match markdown formatting
    # Matches: **bold**, *italic*, `code`, [text](url)
    pattern = r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))'

    parts = re.split(pattern, text)

    for part in parts:
        if not part:
            continue

        # Bold: **text**
        if part.startswith('**') and part.endswith('**'):
            text_content = part[2:-2]
            run = paragraph.add_run(text_content)
            run.bold = True

        # Italic: *text*
        elif part.startswith('*') and part.endswith('*') and not part.startswith('**'):
            text_content = part[1:-1]
            run = paragraph.add_run(text_content)
            run.italic = True

        # Code: `text`
        elif part.startswith('`') and part.endswith('`'):
            text_content = part[1:-1]
            run = paragraph.add_run(text_content)
            run.font.name = 'Courier New'
            run.font.color.rgb = RGBColor(220, 38, 38)  # Red color for code

        # Link: [text](url)
        elif part.startswith('[') and '](' in part:
            match = re.match(r'\[(.*?)\]\((.*?)\)', part)
            if match:
                link_text = match.group(1)
                run = paragraph.add_run(link_text)
                run.font.color.rgb = RGBColor(99, 102, 241)  # Blue color for links
                run.underline = True
        else:
            # Regular text
            paragraph.add_run(part)


def create_docx(project) -> io.BytesIO:
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from datetime import datetime

    doc = Document()

    # Set page margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    # Set default font for the document
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)

    # ============================================
    # TITLE PAGE
    # ============================================
    # Add spacing from top
    for _ in range(8):
        doc.add_paragraph()

    # Add title - centered, large, professional
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run(project.title)
    title_run.font.name = 'Calibri'
    title_run.font.size = Pt(32)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(31, 78, 120)

    # Add spacing
    doc.add_paragraph()
    doc.add_paragraph()

    # Add decorative line
    line_para = doc.add_paragraph()
    line_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    line_run = line_para.add_run('─' * 40)
    line_run.font.color.rgb = RGBColor(100, 100, 100)

    # Add spacing
    doc.add_paragraph()
    doc.add_paragraph()

    # Add subtitle/date
    date_para = doc.add_paragraph()
    date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_run = date_para.add_run(f"Generated on {datetime.now().strftime('%B %d, %Y')}")
    date_run.font.name = 'Calibri'
    date_run.font.size = Pt(12)
    date_run.font.color.rgb = RGBColor(100, 100, 100)

    # Page break after title page
    doc.add_page_break()

    # ============================================
    # TABLE OF CONTENTS PAGE
    # ============================================
    toc_heading = doc.add_heading('Table of Contents', level=1)
    toc_heading_run = toc_heading.runs[0]
    toc_heading_run.font.name = 'Calibri'
    toc_heading_run.font.size = Pt(20)
    toc_heading_run.font.color.rgb = RGBColor(31, 78, 120)

    doc.add_paragraph()

    # Add TOC entries (extract from sections)
    toc_entries = []
    for section in sorted(project.sections, key=lambda x: x.orderIndex):
        content = section.content or ""
        # Extract main headings from markdown
        if '##' in content:
            lines = content.split('\n')
            for line in lines:
                stripped = line.strip()
                if stripped.startswith('## ') and not stripped.startswith('###'):
                    heading_text = stripped[3:].strip()
                    toc_entries.append((heading_text, 1))
                elif stripped.startswith('### '):
                    heading_text = stripped[4:].strip()
                    toc_entries.append((heading_text, 2))

    # Generate TOC
    for entry_text, level in toc_entries:
        toc_para = doc.add_paragraph()
        if level == 1:
            toc_para.paragraph_format.left_indent = Inches(0.25)
            toc_run = toc_para.add_run(f"• {entry_text}")
            toc_run.font.size = Pt(12)
            toc_run.font.bold = True
        else:  # level 2
            toc_para.paragraph_format.left_indent = Inches(0.75)
            toc_run = toc_para.add_run(f"◦ {entry_text}")
            toc_run.font.size = Pt(11)
        toc_run.font.name = 'Calibri'
        toc_run.font.color.rgb = RGBColor(68, 114, 196)
        toc_para.paragraph_format.space_after = Pt(6)

    # Page break after TOC
    doc.add_page_break()

    for section in sorted(project.sections, key=lambda x: x.orderIndex):
        content = section.content or "No content generated yet."

        # Check if content is Markdown (contains ## headings or markdown formatting)
        is_markdown = '##' in content or '**' in content or '*' in content

        if is_markdown:
            # Process Markdown content
            lines = content.split('\n')
            i = 0
            while i < len(lines):
                line = lines[i].strip()

                if not line:
                    i += 1
                    continue

                # Heading level 2: ## Text
                if line.startswith('## '):
                    heading_text = line[3:].strip()
                    heading = doc.add_heading(heading_text, level=1)
                    heading_run = heading.runs[0] if heading.runs else None
                    if heading_run:
                        heading_run.font.name = 'Calibri'
                        heading_run.font.size = Pt(16)
                        heading_run.font.color.rgb = RGBColor(68, 114, 196)
                    heading.space_before = Pt(12)
                    heading.space_after = Pt(6)

                # Heading level 3: ### Text
                elif line.startswith('### '):
                    heading_text = line[4:].strip()
                    heading = doc.add_heading(heading_text, level=2)
                    heading_run = heading.runs[0] if heading.runs else None
                    if heading_run:
                        heading_run.font.name = 'Calibri'
                        heading_run.font.size = Pt(13)
                        heading_run.font.color.rgb = RGBColor(89, 89, 89)
                    heading.space_before = Pt(10)
                    heading.space_after = Pt(4)

                # Heading level 4: #### Text
                elif line.startswith('#### '):
                    heading_text = line[5:].strip()
                    heading = doc.add_heading(heading_text, level=3)
                    heading_run = heading.runs[0] if heading.runs else None
                    if heading_run:
                        heading_run.font.name = 'Calibri'
                        heading_run.font.size = Pt(12)
                        heading_run.font.color.rgb = RGBColor(112, 112, 112)
                    heading.space_before = Pt(8)
                    heading.space_after = Pt(3)

                # Unordered list: - item or * item
                elif line.startswith('- ') or line.startswith('* '):
                    bullet_text = line[2:].strip()
                    p = doc.add_paragraph(style='List Bullet')
                    parse_markdown_line(p, bullet_text)
                    p.paragraph_format.left_indent = Inches(0.25)
                    p.paragraph_format.space_after = Pt(6)

                # Ordered list: 1. item
                elif re.match(r'^\d+\.\s', line):
                    list_text = re.sub(r'^\d+\.\s', '', line).strip()
                    p = doc.add_paragraph(style='List Number')
                    parse_markdown_line(p, list_text)
                    p.paragraph_format.left_indent = Inches(0.25)
                    p.paragraph_format.space_after = Pt(6)

                # Blockquote: > text
                elif line.startswith('> '):
                    quote_text = line[2:].strip()
                    p = doc.add_paragraph()
                    parse_markdown_line(p, quote_text)
                    p.paragraph_format.left_indent = Inches(0.5)
                    p.paragraph_format.space_after = Pt(10)
                    # Add shading for blockquotes
                    from docx.oxml.shared import OxmlElement
                    from docx.oxml.ns import qn
                    shading_elm = OxmlElement('w:shd')
                    shading_elm.set(qn('w:fill'), 'F0F0F0')
                    p._element.get_or_add_pPr().append(shading_elm)

                # Table: | Column | Column |
                elif line.startswith('|') and '|' in line[1:]:
                    # Start of table - collect all table rows
                    table_rows = []
                    table_rows.append(line)
                    i += 1

                    # Collect subsequent table rows
                    while i < len(lines):
                        next_line = lines[i].strip()
                        if next_line.startswith('|'):
                            table_rows.append(next_line)
                            i += 1
                        else:
                            i -= 1  # Step back to process this line normally
                            break

                    # Parse and create table
                    if len(table_rows) >= 2:  # At least header + separator
                        # Parse header
                        header_cells = [cell.strip() for cell in table_rows[0].split('|')[1:-1]]

                        # Skip separator row (row with dashes)
                        data_rows = []
                        for row in table_rows[2:]:  # Skip header and separator
                            cells = [cell.strip() for cell in row.split('|')[1:-1]]
                            if cells and any(cells):  # Not empty row
                                data_rows.append(cells)

                        # Create table in document
                        if header_cells and data_rows:
                            table = doc.add_table(rows=1 + len(data_rows), cols=len(header_cells))
                            table.style = 'Light Grid Accent 1'

                            # Set header row
                            header_row = table.rows[0]
                            for idx, cell_text in enumerate(header_cells):
                                cell = header_row.cells[idx]
                                cell.text = cell_text
                                # Bold header text
                                for paragraph in cell.paragraphs:
                                    for run in paragraph.runs:
                                        run.font.bold = True
                                        run.font.size = Pt(11)

                            # Set data rows
                            for row_idx, row_data in enumerate(data_rows):
                                table_row = table.rows[row_idx + 1]
                                for col_idx, cell_text in enumerate(row_data):
                                    if col_idx < len(header_cells):
                                        table_row.cells[col_idx].text = cell_text

                            # Add spacing after table
                            doc.add_paragraph()

                # Regular paragraph
                else:
                    p = doc.add_paragraph()
                    parse_markdown_line(p, line)
                    p.paragraph_format.space_after = Pt(10)
                    p.paragraph_format.line_spacing = 1.15
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

                i += 1
        else:
            # Legacy format: Plain text processing
            heading = doc.add_heading(section.title, level=1)
            heading_run = heading.runs[0]
            heading_run.font.name = 'Calibri'
            heading_run.font.size = Pt(16)
            heading_run.font.color.rgb = RGBColor(68, 114, 196)
            heading.space_before = Pt(12)
            heading.space_after = Pt(6)

            paragraphs = content.split('\n\n')
            for para_text in paragraphs:
                para_text = para_text.strip()
                if para_text:
                    if para_text.startswith(('•', '-', '*')):
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
                        p = doc.add_paragraph(para_text)
                        p.paragraph_format.space_after = Pt(10)
                        p.paragraph_format.line_spacing = 1.15
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

# ---------- v1 block renderers for PPTX ----------

def _add_bullet_char(p):
    """Force python-pptx to render a • bullet on a paragraph."""
    from pptx.oxml.xmlchemy import OxmlElement
    pPr = p._element.get_or_add_pPr()
    bu_none = pPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}buNone')
    if bu_none is not None:
        pPr.remove(bu_none)
    buChar = OxmlElement('a:buChar')
    buChar.set('char', '•')
    pPr.append(buChar)


def _render_bullets_pptx(slide, items, left, top, width, height):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    items = items or []
    for i, b in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = str(b)
        p.level = 0
        _add_bullet_char(p)
        p.font.size = Pt(18)
        p.font.name = 'Calibri'
        p.font.color.rgb = RGBColor(55, 65, 81)
        p.space_before = Pt(8)


def _render_stats_pptx(slide, items, left, top, width, height):
    """Row of N stat cards (textboxes) with big number + label + sublabel."""
    items = items or []
    n = max(1, len(items))
    gap = Inches(0.15)
    card_w = Inches((width.inches - gap.inches * (n - 1)) / n)
    for i, s in enumerate(items):
        x = Inches(left.inches + i * (card_w.inches + gap.inches))
        box = slide.shapes.add_textbox(x, top, card_w, height)
        tf = box.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = 1  # middle

        # Big value
        p_val = tf.paragraphs[0]
        p_val.text = str(s.get('value', ''))
        p_val.alignment = 2  # center
        p_val.font.size = Pt(36)
        p_val.font.bold = True
        p_val.font.name = 'Calibri'
        p_val.font.color.rgb = RGBColor(67, 56, 202)  # indigo-700

        # Label
        p_lab = tf.add_paragraph()
        p_lab.text = str(s.get('label', ''))
        p_lab.alignment = 2
        p_lab.font.size = Pt(12)
        p_lab.font.bold = True
        p_lab.font.name = 'Calibri'
        p_lab.font.color.rgb = RGBColor(31, 41, 55)
        p_lab.space_before = Pt(4)

        # Optional sublabel
        sub = s.get('sublabel')
        if sub:
            p_sub = tf.add_paragraph()
            p_sub.text = str(sub)
            p_sub.alignment = 2
            p_sub.font.size = Pt(9)
            p_sub.font.name = 'Calibri'
            p_sub.font.color.rgb = RGBColor(107, 114, 128)

        # Card border
        line = box.line
        line.color.rgb = RGBColor(199, 210, 254)  # indigo-100
        line.width = Pt(1)


def _render_table_pptx(slide, headers, rows, left, top, width, height):
    """Native python-pptx table."""
    headers = headers or []
    rows = rows or []
    if not headers or not rows:
        return
    n_cols = len(headers)
    n_rows = len(rows) + 1  # + header row
    table_shape = slide.shapes.add_table(n_rows, n_cols, left, top, width, height)
    table = table_shape.table

    # Header row
    for ci, h in enumerate(headers):
        cell = table.cell(0, ci)
        cell.text = str(h)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(243, 244, 246)  # gray-50
        for p in cell.text_frame.paragraphs:
            p.font.size = Pt(11)
            p.font.bold = True
            p.font.name = 'Calibri'
            p.font.color.rgb = RGBColor(31, 41, 55)

    # Data rows
    for ri, row in enumerate(rows, start=1):
        for ci in range(n_cols):
            cell = table.cell(ri, ci)
            val = row[ci] if ci < len(row) else ''
            cell.text = str(val)
            for p in cell.text_frame.paragraphs:
                p.font.size = Pt(10)
                p.font.name = 'Calibri'
                p.font.color.rgb = RGBColor(55, 65, 81)


def _render_quote_pptx(slide, text, attribution, left, top, width, height):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = 1  # middle

    p = tf.paragraphs[0]
    p.text = f'"{text}"'
    p.font.size = Pt(20)
    p.font.italic = True
    p.font.name = 'Calibri'
    p.font.color.rgb = RGBColor(31, 41, 55)

    if attribution:
        p2 = tf.add_paragraph()
        p2.text = f'— {attribution}'
        p2.font.size = Pt(12)
        p2.font.name = 'Calibri'
        p2.font.color.rgb = RGBColor(107, 114, 128)
        p2.space_before = Pt(8)

    # Left accent bar via the textbox border (approximation)
    line = box.line
    line.color.rgb = RGBColor(245, 158, 11)  # amber-500
    line.width = Pt(2)


def _render_block_pptx(slide, block, left, top, width, height):
    t = (block or {}).get('type')
    if t == 'bullets':
        _render_bullets_pptx(slide, block.get('items') or [], left, top, width, height)
    elif t == 'stats':
        _render_stats_pptx(slide, block.get('items') or [], left, top, width, height)
    elif t == 'table':
        _render_table_pptx(slide, block.get('headers') or [], block.get('rows') or [], left, top, width, height)
    elif t == 'quote':
        _render_quote_pptx(slide, block.get('text', ''), block.get('attribution'), left, top, width, height)


def _render_image_placeholder(slide, suggestion):
    """Right-column image suggestion box (matches editor)."""
    box = slide.shapes.add_textbox(Inches(6), Inches(1.5), Inches(3.5), Inches(3.5))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = 1
    tf.text = f"📷 Image:\n{suggestion}"
    p = tf.paragraphs[0]
    p.font.size = Pt(12)
    p.font.italic = True
    p.font.color.rgb = RGBColor(107, 114, 128)
    p.alignment = 1
    line = box.line
    line.color.rgb = RGBColor(200, 200, 200)
    line.width = Pt(1)


def create_pptx(project) -> io.BytesIO:
    import slide_blocks as _sb

    prs = Presentation()

    # 16:9 widescreen
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)

    # ---- Title slide
    title_slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(title_slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]

    title.text = project.title
    for paragraph in title.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(44)
            run.font.bold = True
            run.font.color.rgb = RGBColor(31, 78, 120)

    subtitle.text = "AI-Generated Presentation"
    for paragraph in subtitle.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(20)
            run.font.color.rgb = RGBColor(100, 100, 100)

    # ---- Content slides
    for section in sorted(project.sections, key=lambda x: x.orderIndex):
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
        parsed = _sb.parse_slide_content(section.content or "")

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.4), Inches(9), Inches(1))
        tf = title_box.text_frame
        tf.text = parsed.get("title") or section.title
        tf.word_wrap = True
        tp = tf.paragraphs[0]
        tp.font.size = Pt(36)
        tp.font.bold = True
        tp.font.name = "Calibri"
        tp.font.color.rgb = RGBColor(17, 24, 39)

        # Layout — content area is everything below the title
        content_top = Inches(1.5)
        content_height = Inches(3.5)
        has_image = bool(parsed.get("image_suggestion"))
        if has_image:
            content_left = Inches(0.5)
            content_width = Inches(5)
        else:
            content_left = Inches(1)
            content_width = Inches(8)

        blocks = parsed.get("blocks") or []
        if blocks:
            # Stack blocks vertically, splitting available height.
            n = len(blocks)
            block_height = Inches(content_height.inches / n)
            for i, block in enumerate(blocks):
                top = Inches(content_top.inches + i * block_height.inches)
                _render_block_pptx(slide, block, content_left, top, content_width, block_height)

        if has_image:
            _render_image_placeholder(slide, parsed["image_suggestion"])

    file_stream = io.BytesIO()
    prs.save(file_stream)
    file_stream.seek(0)
    return file_stream
