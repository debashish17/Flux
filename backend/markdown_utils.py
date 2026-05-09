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


def _normalize_title(title: str) -> str:
    """
    Reduce a section title to a comparable key.
    Strips text after first colon, parens/brackets, collapses whitespace, lowercases.
    "Executive Summary: The Vision..."  -> "executive summary"
    "Market Analysis (Deep Dive)"        -> "market analysis"
    """
    # Drop everything after the first colon
    head = title.split(":", 1)[0]
    # Drop ()/[] groups
    head = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", head)
    # Collapse whitespace
    head = re.sub(r"\s+", " ", head).strip().lower()
    return head


def short_title(title: str) -> str:
    """Public helper used by the AI prompt. Same normalization, but preserves case."""
    head = title.split(":", 1)[0]
    head = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", head)
    return re.sub(r"\s+", " ", head).strip()


def split_markdown_by_sections(full_markdown: str, expected_sections: List[str]) -> Dict[str, str]:
    """
    Split a full Markdown document into individual sections.

    Strategy:
      1. Parse all '## Heading' blocks from the AI output, keyed by normalized title.
      2. For each expected section, look up its normalized title (exact match).
      3. Fall back to fuzzy matching only when normalization fails.
      4. Track consumed parsed sections so a single '## Conclusion' isn't reused
         across multiple expected titles.
    """
    logger.info(f"Splitting markdown document into {len(expected_sections)} sections")

    sections_content: Dict[str, str] = {}

    # Parse '## Title' blocks
    pattern = r"^## (.+?)$"
    parts = re.split(pattern, full_markdown, flags=re.MULTILINE)

    # parts[0] is preamble (title + intro). parts[1::2] are headings, parts[2::2] are bodies.
    parsed: Dict[str, Dict[str, str]] = {}  # normalized_key -> {raw_title, content}
    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            continue
        raw_title = parts[i].strip()
        body = parts[i + 1].strip()
        key = _normalize_title(raw_title)
        if not key:
            continue
        # First occurrence wins; later duplicates ignored
        parsed.setdefault(key, {"raw_title": raw_title, "content": body})

    consumed: set = set()

    for expected in expected_sections:
        expected_short = short_title(expected)
        expected_key = _normalize_title(expected)

        # Exact normalized match
        if expected_key in parsed and expected_key not in consumed:
            block = parsed[expected_key]
            sections_content[expected] = f"## {block['raw_title']}\n\n{block['content']}"
            consumed.add(expected_key)
            logger.info(f"Matched section (normalized): {expected_short}")
            continue

        # Fuzzy fallback (token overlap), excluding already-consumed parses
        best_key = None
        best_score = 0.0
        expected_words = set(expected_key.split())
        for key, block in parsed.items():
            if key in consumed:
                continue
            if key in expected_key or expected_key in key:
                # substring match — generous score
                score = min(len(key), len(expected_key)) / max(len(key), len(expected_key)) * 100
            else:
                parsed_words = set(key.split())
                common = expected_words & parsed_words
                if not common:
                    continue
                score = len(common) / max(len(expected_words), len(parsed_words)) * 60
            if score > best_score:
                best_score = score
                best_key = key

        if best_key and best_score >= 40:
            block = parsed[best_key]
            sections_content[expected] = f"## {block['raw_title']}\n\n{block['content']}"
            consumed.add(best_key)
            logger.info(f"Fuzzy matched (score {best_score:.0f}%): {expected_short} ← {block['raw_title']}")
        else:
            sections_content[expected] = f"## {expected_short}\n\n*Content for this section was not generated.*"
            logger.warning(f"Section not found in generated content: {expected_short}")

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
