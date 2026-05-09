/**
 * Slide content schema (v1) + parser. Mirror of backend/slide_blocks.py.
 *
 * A slide's `content` field is either:
 *   1. v1 JSON: { v: 1, title, blocks: [...], image_suggestion }
 *   2. Legacy text:  TITLE: ... \n CONTENT: \n• ... \n IMAGE_SUGGESTION: ...
 *
 * Always returns the normalized shape: { title, blocks, image_suggestion }.
 */

export const SCHEMA_VERSION = 1;
const VALID_BLOCK_TYPES = new Set(['bullets', 'stats', 'table', 'quote']);

/** @returns {{title: string, blocks: Array<object>, image_suggestion: string|null}} */
export function parseSlideContent(content) {
    if (!content || !String(content).trim()) return emptySlide();

    const text = String(content).trim();

    if (text.startsWith('{')) {
        try {
            const data = JSON.parse(text);
            if (data && data.v === SCHEMA_VERSION) return normalizeV1(data);
        } catch {
            // fall through to legacy
        }
    }

    return parseLegacy(text);
}

export function serializeSlideContent(slide) {
    return JSON.stringify({
        v: SCHEMA_VERSION,
        title: slide.title || '',
        blocks: normalizeBlocks(slide.blocks || []),
        image_suggestion: slide.image_suggestion || null,
    });
}

export function isV1Json(content) {
    if (!content || !String(content).trim().startsWith('{')) return false;
    try {
        const data = JSON.parse(content);
        return data && data.v === SCHEMA_VERSION;
    } catch {
        return false;
    }
}

// -------------------- internals --------------------

function emptySlide() {
    return { title: '', blocks: [], image_suggestion: null };
}

function normalizeV1(data) {
    return {
        title: String(data.title || ''),
        blocks: normalizeBlocks(data.blocks || []),
        image_suggestion: data.image_suggestion || null,
    };
}

function normalizeBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    const out = [];
    for (const b of blocks) {
        if (!b || typeof b !== 'object') continue;
        const t = b.type;
        if (!VALID_BLOCK_TYPES.has(t)) continue;

        if (t === 'bullets') {
            const items = (b.items || [])
                .filter((x) => x !== null && x !== undefined)
                .map((x) => String(x).trim())
                .filter(Boolean);
            if (items.length) out.push({ type: 'bullets', items });
        } else if (t === 'stats') {
            const items = [];
            for (const s of b.items || []) {
                if (!s || typeof s !== 'object') continue;
                const value = String(s.value || '').trim();
                const label = String(s.label || '').trim();
                if (value && label) {
                    const item = { value, label };
                    if (s.sublabel) item.sublabel = String(s.sublabel).trim();
                    items.push(item);
                }
            }
            if (items.length) out.push({ type: 'stats', items });
        } else if (t === 'table') {
            const headers = (b.headers || []).map(String);
            const rows = (b.rows || [])
                .filter((r) => Array.isArray(r))
                .map((r) => r.map(String));
            if (headers.length && rows.length) out.push({ type: 'table', headers, rows });
        } else if (t === 'quote') {
            const txt = String(b.text || '').trim();
            if (txt) {
                const blk = { type: 'quote', text: txt };
                if (b.attribution) blk.attribution = String(b.attribution).trim();
                out.push(blk);
            }
        }
    }
    return out;
}

function parseLegacy(text) {
    const lines = text.split('\n');
    let title = '';
    const bullets = [];
    let imageSuggestion = null;
    let inContent = false;
    const speakerKeywords = ['SPEAKER_NOTES:', 'NOTES:', 'SPEAKER:', 'NOTE:'];

    for (const raw of lines) {
        const line = raw.trim();
        if (speakerKeywords.some((k) => line.toUpperCase().startsWith(k))) {
            inContent = false;
            continue;
        }
        if (line.startsWith('TITLE:')) {
            title = line.slice('TITLE:'.length).trim();
        } else if (line.startsWith('CONTENT:')) {
            inContent = true;
        } else if (line.startsWith('IMAGE_SUGGESTION:')) {
            imageSuggestion = line.slice('IMAGE_SUGGESTION:'.length).trim() || null;
            inContent = false;
        } else if (inContent && line) {
            bullets.push(line.replace(/^[•\-*]\s*/, '').trim());
        }
    }

    const blocks = [];
    const items = bullets.filter(Boolean);
    if (items.length) blocks.push({ type: 'bullets', items });

    return { title, blocks, image_suggestion: imageSuggestion };
}
