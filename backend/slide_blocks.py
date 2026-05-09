"""
Slide content schema (v1) + parser.

A slide stored in DB is a string in DocumentSection.content. The new format
is JSON; legacy slides used a TITLE/CONTENT/IMAGE_SUGGESTION text format.
This module hides that difference behind a single parse_slide_content().

JSON schema (v1):
{
  "v": 1,
  "title": str,
  "blocks": [Block, ...],
  "image_suggestion": str | None
}

Block types:
  {"type": "bullets", "items": [str, ...]}
  {"type": "stats",   "items": [{"value": str, "label": str, "sublabel": str|None}, ...]}
  {"type": "table",   "headers": [str, ...], "rows": [[str, ...], ...]}
  {"type": "quote",   "text": str, "attribution": str|None}
"""
from __future__ import annotations
import json
from typing import Any


SCHEMA_VERSION = 1
VALID_BLOCK_TYPES = {"bullets", "stats", "table", "quote"}


def parse_slide_content(content: str) -> dict:
    """
    Parse a slide's stored content into a normalized dict:
        {"title": str, "blocks": [...], "image_suggestion": str | None}

    Handles both v1 JSON and legacy TITLE/CONTENT/IMAGE_SUGGESTION text.
    Always returns the normalized shape; never raises on malformed input.
    """
    if not content or not content.strip():
        return _empty_slide()

    text = content.strip()
    # Try JSON first
    if text.startswith("{"):
        try:
            data = json.loads(text)
            if isinstance(data, dict) and data.get("v") == SCHEMA_VERSION:
                return _normalize_v1(data)
        except (json.JSONDecodeError, TypeError):
            pass  # fall through to legacy

    # Legacy text format
    return _parse_legacy(text)


def serialize_slide_content(slide: dict) -> str:
    """Serialize a normalized slide dict back to the v1 JSON storage string."""
    payload = {
        "v": SCHEMA_VERSION,
        "title": slide.get("title", ""),
        "blocks": _normalize_blocks(slide.get("blocks", [])),
        "image_suggestion": slide.get("image_suggestion") or None,
    }
    return json.dumps(payload, ensure_ascii=False)


def is_v1_json(content: str) -> bool:
    """True if `content` is parseable v1 JSON. Used by callers that want to
    know whether they're dealing with new vs legacy storage."""
    if not content or not content.strip().startswith("{"):
        return False
    try:
        data = json.loads(content)
        return isinstance(data, dict) and data.get("v") == SCHEMA_VERSION
    except (json.JSONDecodeError, TypeError):
        return False


# -------------------- internals --------------------

def _empty_slide() -> dict:
    return {"title": "", "blocks": [], "image_suggestion": None}


def _normalize_v1(data: dict) -> dict:
    return {
        "title": str(data.get("title") or ""),
        "blocks": _normalize_blocks(data.get("blocks") or []),
        "image_suggestion": data.get("image_suggestion") or None,
    }


def _normalize_blocks(blocks: Any) -> list[dict]:
    if not isinstance(blocks, list):
        return []
    out = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        t = b.get("type")
        if t not in VALID_BLOCK_TYPES:
            continue
        if t == "bullets":
            items = [
                str(x).strip()
                for x in (b.get("items") or [])
                if x is not None and str(x).strip()
            ]
            if items:
                out.append({"type": "bullets", "items": items})
        elif t == "stats":
            items = []
            for s in b.get("items") or []:
                if not isinstance(s, dict):
                    continue
                value = str(s.get("value") or "").strip()
                label = str(s.get("label") or "").strip()
                if value and label:
                    item = {"value": value, "label": label}
                    sub = s.get("sublabel")
                    if sub:
                        item["sublabel"] = str(sub).strip()
                    items.append(item)
            if items:
                out.append({"type": "stats", "items": items})
        elif t == "table":
            headers = [str(h) for h in (b.get("headers") or [])]
            rows = []
            for row in b.get("rows") or []:
                if isinstance(row, list):
                    rows.append([str(c) for c in row])
            if headers and rows:
                out.append({"type": "table", "headers": headers, "rows": rows})
        elif t == "quote":
            text = str(b.get("text") or "").strip()
            if text:
                block = {"type": "quote", "text": text}
                attr = b.get("attribution")
                if attr:
                    block["attribution"] = str(attr).strip()
                out.append(block)
    return out


def _parse_legacy(text: str) -> dict:
    """Parse the old TITLE/CONTENT/IMAGE_SUGGESTION text format into the
    normalized shape, with the body becoming a single bullets block."""
    lines = text.split("\n")
    title = ""
    bullets: list[str] = []
    image_suggestion: str | None = None
    in_content = False

    speaker_keywords = ("SPEAKER_NOTES:", "NOTES:", "SPEAKER:", "NOTE:")

    for raw in lines:
        line = raw.strip()
        if any(line.upper().startswith(k) for k in speaker_keywords):
            in_content = False
            continue
        if line.startswith("TITLE:"):
            title = line.split("TITLE:", 1)[1].strip()
        elif line.startswith("CONTENT:"):
            in_content = True
        elif line.startswith("IMAGE_SUGGESTION:"):
            image_suggestion = line.split("IMAGE_SUGGESTION:", 1)[1].strip() or None
            in_content = False
        elif in_content and line:
            bullets.append(line.lstrip("•-*").strip())

    blocks = []
    if bullets:
        blocks.append({"type": "bullets", "items": [b for b in bullets if b]})

    return {
        "title": title,
        "blocks": blocks,
        "image_suggestion": image_suggestion,
    }
