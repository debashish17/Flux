/**
 * Renders a typed slide block (v1 schema).
 *
 * Bullets uses the existing inline-edit UX provided by the parent via
 * `bulletsRender`. Stats / table / quote support inline editing through
 * `onChange(updatedBlock)` — which the parent persists via the standard
 * optimistic-update + debounced PATCH flow.
 */
import { useState, useEffect, useRef } from 'react';
import { Quote, Plus, X } from 'lucide-react';

export default function SlideBlockRenderer({ block, bulletsRender, onChange, onDelete }) {
    if (!block || !block.type) return null;

    if (block.type === 'bullets') {
        if (typeof bulletsRender === 'function') return bulletsRender(block);
        return <BulletsBlock items={block.items || []} />;
    }
    if (block.type === 'stats') {
        return <StatsBlock block={block} onChange={onChange} onDelete={onDelete} />;
    }
    if (block.type === 'table') {
        return <TableBlock block={block} onChange={onChange} onDelete={onDelete} />;
    }
    if (block.type === 'quote') {
        return <QuoteBlock block={block} onChange={onChange} onDelete={onDelete} />;
    }
    return null;
}

// -------------------- Bullets (read-only fallback) --------------------

function BulletsBlock({ items }) {
    if (!items.length) return <p className="text-gray-400">No bullet points</p>;
    return (
        <ul className="space-y-4">
            {items.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="text-indigo-600 font-bold mt-1 text-xl">•</span>
                    <span className="flex-1 text-lg text-gray-700 leading-relaxed">{b}</span>
                </li>
            ))}
        </ul>
    );
}

// -------------------- shared inline editor --------------------

/**
 * Hook for click-to-edit text fields. Commits on blur/Enter, cancels on Escape.
 * `multiline` switches between input and textarea.
 */
function useInlineEdit(value, onCommit) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

    const begin = () => { setDraft(value); setEditing(true); };
    const commit = () => {
        setEditing(false);
        if (draft !== value) onCommit(draft);
    };
    const cancel = () => { setEditing(false); setDraft(value); };
    return { editing, draft, setDraft, begin, commit, cancel };
}

function InlineText({
    value,
    onCommit,
    placeholder = '',
    multiline = false,
    className = '',
    inputClassName = '',
    displayClassName = '',
}) {
    const { editing, draft, setDraft, begin, commit, cancel } = useInlineEdit(value, onCommit);
    const ref = useRef(null);
    useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

    if (editing) {
        const Tag = multiline ? 'textarea' : 'input';
        const props = {
            ref,
            value: draft,
            onChange: (e) => setDraft(e.target.value),
            onBlur: commit,
            onKeyDown: (e) => {
                if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
                else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            },
            placeholder,
            className: `${inputClassName} bg-transparent border border-indigo-400 rounded px-1 outline-none focus:ring-2 focus:ring-indigo-400 ${className}`,
        };
        if (!multiline) props.type = 'text';
        return <Tag {...props} />;
    }
    return (
        <span
            onClick={begin}
            className={`cursor-text hover:bg-gray-50 rounded px-1 -mx-1 transition-colors ${displayClassName} ${className}`}
            title="Click to edit"
        >
            {value || <span className="text-gray-400">{placeholder}</span>}
        </span>
    );
}

// -------------------- Stats --------------------

function StatsBlock({ block, onChange, onDelete }) {
    const items = block.items || [];
    const cols = Math.min(Math.max(items.length, 1), 4);
    const gridCls = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols];

    const updateItem = (idx, field, val) => {
        if (!onChange) return;
        const next = [...items];
        next[idx] = { ...next[idx], [field]: val };
        onChange({ ...block, items: next });
    };

    const removeItem = (idx) => {
        if (!onChange) return;
        const next = items.filter((_, i) => i !== idx);
        if (next.length === 0 && onDelete) { onDelete(); return; }
        onChange({ ...block, items: next });
    };

    const addItem = () => {
        if (!onChange) return;
        if (items.length >= 4) return;
        onChange({ ...block, items: [...items, { value: 'NEW', label: 'Label' }] });
    };

    return (
        <div className="relative">
            <BlockToolbar onDelete={onDelete} />
            <div className={`grid ${gridCls} gap-4`}>
                {items.map((s, i) => (
                    <div
                        key={i}
                        className="relative bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 text-center"
                    >
                        {onChange && (
                            <button
                                onClick={() => removeItem(i)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full hidden group-hover:flex items-center justify-center text-gray-400 hover:text-red-500"
                                title="Remove stat"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                        <div className="text-4xl font-bold text-indigo-700 leading-tight">
                            <InlineText
                                value={s.value || ''}
                                onCommit={(v) => updateItem(i, 'value', v)}
                                placeholder="0"
                                inputClassName="text-4xl font-bold text-indigo-700 text-center w-full"
                                displayClassName="text-4xl font-bold text-indigo-700"
                            />
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-800">
                            <InlineText
                                value={s.label || ''}
                                onCommit={(v) => updateItem(i, 'label', v)}
                                placeholder="Label"
                                inputClassName="text-sm font-semibold text-gray-800 text-center w-full"
                            />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            <InlineText
                                value={s.sublabel || ''}
                                onCommit={(v) => updateItem(i, 'sublabel', v)}
                                placeholder="(sublabel)"
                                inputClassName="text-xs text-gray-500 text-center w-full"
                            />
                        </div>
                    </div>
                ))}
            </div>
            {onChange && items.length < 4 && (
                <button
                    onClick={addItem}
                    className="mt-3 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 border-dashed flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add stat
                </button>
            )}
        </div>
    );
}

// -------------------- Table --------------------

function TableBlock({ block, onChange, onDelete }) {
    const headers = block.headers || [];
    const rows = block.rows || [];

    const updateHeader = (i, val) => {
        if (!onChange) return;
        const next = [...headers];
        next[i] = val;
        onChange({ ...block, headers: next });
    };
    const updateCell = (ri, ci, val) => {
        if (!onChange) return;
        const next = rows.map((r) => [...r]);
        next[ri][ci] = val;
        onChange({ ...block, rows: next });
    };
    const addRow = () => {
        if (!onChange) return;
        const newRow = headers.map(() => '');
        onChange({ ...block, rows: [...rows, newRow] });
    };
    const removeRow = (ri) => {
        if (!onChange) return;
        const next = rows.filter((_, i) => i !== ri);
        if (next.length === 0 && onDelete) { onDelete(); return; }
        onChange({ ...block, rows: next });
    };
    const addColumn = () => {
        if (!onChange) return;
        if (headers.length >= 5) return;
        onChange({
            ...block,
            headers: [...headers, 'New'],
            rows: rows.map((r) => [...r, '']),
        });
    };
    const removeColumn = (ci) => {
        if (!onChange) return;
        if (headers.length <= 1) return;
        onChange({
            ...block,
            headers: headers.filter((_, i) => i !== ci),
            rows: rows.map((r) => r.filter((_, i) => i !== ci)),
        });
    };

    return (
        <div className="relative">
            <BlockToolbar onDelete={onDelete} />
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    className="px-4 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200 group"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <InlineText
                                            value={h}
                                            onCommit={(v) => updateHeader(i, v)}
                                            placeholder="Column"
                                            inputClassName="font-semibold text-gray-700"
                                        />
                                        {onChange && headers.length > 1 && (
                                            <button
                                                onClick={() => removeColumn(i)}
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                                title="Remove column"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className={`group ${ri % 2 ? 'bg-gray-50' : ''}`}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-4 py-2.5 text-gray-700 border-b border-gray-100">
                                        <div className="flex items-center justify-between gap-2">
                                            <InlineText
                                                value={cell}
                                                onCommit={(v) => updateCell(ri, ci, v)}
                                                placeholder="—"
                                                inputClassName="text-gray-700"
                                            />
                                            {onChange && ci === row.length - 1 && (
                                                <button
                                                    onClick={() => removeRow(ri)}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                                    title="Remove row"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {onChange && (
                <div className="mt-2 flex items-center gap-2">
                    <button
                        onClick={addRow}
                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 border-dashed flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Row
                    </button>
                    {headers.length < 5 && (
                        <button
                            onClick={addColumn}
                            className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 border-dashed flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Column
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// -------------------- Quote --------------------

function QuoteBlock({ block, onChange, onDelete }) {
    return (
        <div className="relative pl-12 pr-4 py-6 bg-amber-50/40 border-l-4 border-amber-400 rounded-r-lg">
            <BlockToolbar onDelete={onDelete} />
            <Quote className="absolute left-3 top-5 w-6 h-6 text-amber-500" />
            <p className="text-2xl italic text-gray-800 leading-relaxed">
                "
                <InlineText
                    value={block.text || ''}
                    onCommit={(v) => onChange?.({ ...block, text: v })}
                    multiline
                    placeholder="Quote text"
                    inputClassName="text-2xl italic text-gray-800 leading-relaxed w-full min-h-[3rem] resize-none"
                />
                "
            </p>
            <div className="mt-3 text-sm font-medium text-gray-600">
                —{' '}
                <InlineText
                    value={block.attribution || ''}
                    onCommit={(v) => onChange?.({ ...block, attribution: v })}
                    placeholder="Attribution (optional)"
                    inputClassName="text-sm font-medium text-gray-600"
                />
            </div>
        </div>
    );
}

// -------------------- shared toolbar --------------------

function BlockToolbar({ onDelete }) {
    if (!onDelete) return null;
    return (
        <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onDelete}
                className="px-2 py-0.5 text-xs text-red-600 bg-white border border-red-200 rounded shadow-sm hover:bg-red-50"
                title="Remove block"
            >
                Remove
            </button>
        </div>
    );
}
