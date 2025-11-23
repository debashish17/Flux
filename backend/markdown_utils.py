"""
Markdown Processing Utilities
Handles Markdown → HTML conversion and document parsing
"""

import markdown
from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)


def markdown_to_html(markdown_content: str) -> str:
    """
    Convert Markdown to HTML with appropriate extensions

    Args:
        markdown_content: Raw markdown text

    Returns:
        HTML string
    """
    if not markdown_content:
        return ""

    # Configure markdown with useful extensions
    html = markdown.markdown(
        markdown_content,
        extensions=[
            'extra',          # Includes tables, fenced code blocks, etc.
            'nl2br',          # Newline to <br>
            'sane_lists',     # Better list handling
            'smarty',         # Smart quotes and dashes
            'toc',            # Table of contents
        ],
        extension_configs={
            'toc': {
                'anchorlink': False,  # Don't add anchor links in headings
            }
        }
    )

    return html


def split_markdown_by_sections(full_markdown: str, expected_sections: List[str]) -> Dict[str, str]:
    """
    Split a full Markdown document into individual sections

    Args:
        full_markdown: Complete markdown document with ## headings
        expected_sections: List of expected section titles (in order)

    Returns:
        Dictionary mapping section titles to their markdown content
    """
    logger.info(f"Splitting markdown document into {len(expected_sections)} sections")

    sections_content = {}

    # Split by ## headings (level 2)
    # Pattern: ## Section Title followed by content until next ## or end
    pattern = r'^## (.+?)$'
    parts = re.split(pattern, full_markdown, flags=re.MULTILINE)

    # parts[0] is content before first ## (usually title and intro)
    # parts[1], parts[2], parts[3], parts[4]... are alternating titles and content

    current_sections = {}
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            section_title = parts[i].strip()
            section_content = parts[i + 1].strip()
            current_sections[section_title.lower()] = f"## {section_title}\n\n{section_content}"

    # Match expected sections to parsed sections (fuzzy matching)
    for expected in expected_sections:
        # Extract core section name (before any parentheses or description)
        # E.g., "Executive Summary (Summarizes...)" -> "Executive Summary"
        expected_core = re.sub(r'\s*\([^)]*\)\s*', '', expected).strip()
        expected_lower = expected.lower()
        expected_core_lower = expected_core.lower()

        # Try exact match first
        if expected_lower in current_sections:
            sections_content[expected] = current_sections[expected_lower]
            logger.info(f"Matched section (exact): {expected}")
        elif expected_core_lower in current_sections:
            sections_content[expected] = current_sections[expected_core_lower]
            logger.info(f"Matched section (core): {expected} → {expected_core}")
        else:
            # Try partial match - find best match
            best_match = None
            best_score = 0

            for parsed_title, content in current_sections.items():
                # Calculate match score
                score = 0

                # Check if parsed title is substring of expected (high score)
                if parsed_title in expected_core_lower:
                    score = len(parsed_title) / len(expected_core_lower) * 100

                # Check if expected core is substring of parsed (medium score)
                elif expected_core_lower in parsed_title:
                    score = len(expected_core_lower) / len(parsed_title) * 80

                # Check for significant word overlap
                else:
                    expected_words = set(expected_core_lower.split())
                    parsed_words = set(parsed_title.split())
                    common_words = expected_words & parsed_words
                    if len(common_words) > 0:
                        score = len(common_words) / max(len(expected_words), len(parsed_words)) * 60

                if score > best_score:
                    best_score = score
                    best_match = (parsed_title, content)

            # Use best match if score is high enough (threshold: 40%)
            if best_match and best_score > 40:
                sections_content[expected] = best_match[1]
                logger.info(f"Fuzzy matched section (score: {best_score:.1f}%): {expected} → {best_match[0]}")
            else:
                # Section not found, create placeholder
                sections_content[expected] = f"## {expected_core}\n\n*Content for this section was not generated.*"
                logger.warning(f"Section not found in generated content: {expected}")

    logger.info(f"Successfully split document into {len(sections_content)} sections")
    return sections_content


def extract_title_from_markdown(markdown_content: str) -> str:
    """
    Extract the main title (# heading) from markdown

    Args:
        markdown_content: Markdown text

    Returns:
        Title string (or empty if not found)
    """
    lines = markdown_content.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    return ""


def clean_markdown_for_preview(markdown_content: str) -> str:
    """
    Clean up markdown content for better HTML preview

    Args:
        markdown_content: Raw markdown

    Returns:
        Cleaned markdown
    """
    # Remove excessive line breaks (more than 2 consecutive)
    content = re.sub(r'\n{3,}', '\n\n', markdown_content)

    # Ensure proper spacing around headings
    content = re.sub(r'([^\n])\n(#{1,6} )', r'\1\n\n\2', content)
    content = re.sub(r'(#{1,6} .+)\n([^\n])', r'\1\n\n\2', content)

    return content.strip()


def markdown_to_plain_text(markdown_content: str) -> str:
    """
    Convert markdown to plain text (remove all formatting)

    Args:
        markdown_content: Markdown text

    Returns:
        Plain text
    """
    # Remove headings markers
    text = re.sub(r'^#{1,6}\s+', '', markdown_content, flags=re.MULTILINE)

    # Remove bold/italic
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)

    # Remove links but keep text
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)

    # Remove inline code
    text = re.sub(r'`(.+?)`', r'\1', text)

    # Remove bullet points
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)

    # Remove numbered lists
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)

    # Remove blockquotes
    text = re.sub(r'^\s*>\s+', '', text, flags=re.MULTILINE)

    return text.strip()
