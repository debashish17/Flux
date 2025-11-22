import React, { useState, useEffect, useRef, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Enhanced configuration
const CONFIG = {
    MAX_LINES_PER_PAGE: 45,
    MIN_LINES_AFTER_HEADING: 8,
    ERROR_PREVIEW_LENGTH: 40,
    CHARS_PER_LINE: 90,
    MARKER_PREFIX: '__LATEX_INTERNAL_',
    PAGE_WIDTH_INCHES: 8.5,
    PAGE_HEIGHT_INCHES: 11,
    PAGE_PADDING_INCHES: 1,
};

/**
 * Enhanced Math Renderer with better error handling
 */
const MathRenderer = ({ latex, displayMode = false }) => {
    const containerRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!containerRef.current || !latex) return;

        try {
            katex.render(latex, containerRef.current, {
                displayMode,
                throwOnError: false,
                errorColor: '#dc2626',
                strict: false,
                trust: false,
                macros: {
                    '\\bm': '\\boldsymbol{#1}',
                    '\\coloneq': '\\mathrel{\\vcenter{:}}=',
                    '\\RR': '\\mathbb{R}',
                    '\\NN': '\\mathbb{N}',
                    '\\ZZ': '\\mathbb{Z}',
                    '\\QQ': '\\mathbb{Q}',
                    '\\CC': '\\mathbb{C}',
                    '\\PP': '\\mathbb{P}',
                    '\\FF': '\\mathbb{F}',
                },
                fleqn: false,
            });
            setError(null);
        } catch (err) {
            setError(err.message);
            if (containerRef.current) {
                const preview = latex.substring(0, CONFIG.ERROR_PREVIEW_LENGTH);
                containerRef.current.textContent = `[Math Error: ${preview}${latex.length > CONFIG.ERROR_PREVIEW_LENGTH ? '...' : ''}]`;
            }
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [latex, displayMode]);

    if (error && displayMode) {
        return (
            <div className="my-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r text-sm text-red-800">
                <strong className="font-semibold">Math Rendering Error:</strong>
                <p className="mt-1 font-mono text-xs">{error}</p>
            </div>
        );
    }

    return displayMode ? (
        <div ref={containerRef} className="my-6 overflow-x-auto overflow-y-hidden text-center" />
    ) : (
        <span ref={containerRef} className="inline-block align-middle mx-0.5" />
    );
};

/**
 * Enhanced LaTeX Parser with improved robustness
 */
class LatexParser {
    constructor(latex) {
        this.latex = latex || '';
        this.mathStore = [];
        this.mathIndex = 0;
        this.figureIndex = 0;
        this.tableIndex = 0;
    }

    parse() {
        try {
            let content = this.latex;

            // Step 1: Remove comments
            content = this.removeComments(content);

            // Step 2: Remove labels and options
            content = this.cleanLabelsAndOptions(content);

            // Step 3: Extract metadata
            const metadata = this.extractMetadata(content);

            // Step 4: Extract document body
            content = this.extractDocumentBody(content);

            // Step 5: Check for table of contents
            const hasTOC = /\\tableofcontents/.test(this.latex);

            // Step 6: Parse structure
            const { sections, tables } = this.parseStructure(content);

            return {
                metadata,
                sections,
                tables,
                hasTOC,
            };
        } catch (error) {
            console.error('LaTeX parsing error:', error);
            return this.getErrorFallback(error);
        }
    }

    getErrorFallback(error) {
        return {
            metadata: { 
                title: 'Document Parsing Error', 
                author: '', 
                date: '',
                documentClass: 'article'
            },
            sections: [{
                title: 'Error',
                content: `Unable to parse LaTeX document.\n\nError: ${error.message}\n\nPlease check your LaTeX syntax and try again.`,
                level: 2,
                mathStore: []
            }],
            tables: [],
            hasTOC: false,
        };
    }

    removeComments(text) {
        return text.split('\n')
            .map(line => {
                const commentIndex = line.indexOf('%');
                if (commentIndex === -1) return line;
                if (commentIndex > 0 && line[commentIndex - 1] === '\\') return line;
                return line.substring(0, commentIndex);
            })
            .join('\n');
    }

    cleanLabelsAndOptions(text) {
        // Remove label commands and options more comprehensively
        return text
            .replace(/\\label\{[^}]*\}/g, '')
            .replace(/^\s*\[label=[^\]]*\]\s*$/gm, '')
            .replace(/\[label=[^\]]*\]/g, '')
            .replace(/\[h\]/g, '')
            .replace(/\[H\]/g, '')
            .replace(/\[t\]/g, '')
            .replace(/\[b\]/g, '')
            .replace(/\[p\]/g, '')
            .replace(/\[htbp\]/g, '')
            .replace(/\[!htbp\]/g, '');
    }

    extractMetadata(text) {
        const metadata = {
            title: '',
            author: '',
            date: '',
            documentClass: 'article',
            abstract: '',
        };

        try {
            // Document class
            const classMatch = text.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/);
            if (classMatch) {
                metadata.documentClass = classMatch[1];
            }

            // Title
            const titleMatch = text.match(/\\title\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
            if (titleMatch) {
                metadata.title = this.cleanText(titleMatch[1]);
            }

            // Author
            const authorMatch = text.match(/\\author\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
            if (authorMatch) {
                metadata.author = this.cleanText(authorMatch[1]);
            }

            // Date
            const dateMatch = text.match(/\\date\{([^}]+)\}/);
            if (dateMatch) {
                let dateText = dateMatch[1];
                if (dateText.includes('\\today')) {
                    const today = new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    dateText = dateText.replace(/\\today/g, today);
                }
                metadata.date = this.cleanText(dateText);
            }

            // Abstract
            const abstractMatch = text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
            if (abstractMatch) {
                metadata.abstract = this.cleanText(abstractMatch[1]);
            }
        } catch (error) {
            console.error('Metadata extraction error:', error);
        }

        return metadata;
    }

    extractDocumentBody(text) {
        const beginMatch = text.match(/\\begin\{document\}([\s\S]*)/);
        if (!beginMatch) return text;

        let body = beginMatch[1];
        const endMatch = body.match(/([\s\S]*)\\end\{document\}/);
        if (endMatch) {
            body = endMatch[1];
        }

        return body;
    }

    parseStructure(text) {
        const sections = [];
        const tables = [];

        // Remove document commands
        text = text
            .replace(/\\maketitle/g, '')
            .replace(/\\tableofcontents/g, '')
            .replace(/\\listoffigures/g, '')
            .replace(/\\listoftables/g, '')
            .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '');

        // Extract tables
        let textWithoutTables = this.extractTables(text, tables);

        // Extract sections
        this.extractSections(textWithoutTables, sections);

        return { sections, tables };
    }

    extractTables(text, tables) {
        let textWithoutTables = text;
        let tableIdx = 0;

        // Full table environments
        const fullTableRegex = /\\begin\{table\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g;
        let match;
        
        while ((match = fullTableRegex.exec(text)) !== null) {
            const tableBlock = match[0];
            const tableInner = match[1];
            
            const captionMatch = tableInner.match(/\\caption\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
            const caption = captionMatch ? this.cleanText(captionMatch[1]) : '';
            
            const tabularMatch = tableInner.match(/\\begin\{tabular\}(\{[^}]*\}|[^\n]*?)\s*([\s\S]*?)\\end\{tabular\}/);
            
            if (tabularMatch) {
                const tableSpec = tabularMatch[1].replace(/[{}]/g, '');
                const tableContent = tabularMatch[2];
                const marker = `${CONFIG.MARKER_PREFIX}TABLE_${tableIdx}__`;
                
                tables.push({ 
                    marker, 
                    spec: tableSpec, 
                    content: tableContent, 
                    caption,
                    index: tableIdx + 1,
                });
                
                textWithoutTables = textWithoutTables.replace(tableBlock, `\n\n${marker}\n\n`);
                tableIdx++;
            }
        }

        // Standalone tabulars
        const tabularRegex = /\\begin\{tabular\}(\{[^}]*\}|[^\n]*?)\s*([\s\S]*?)\\end\{tabular\}/g;
        
        while ((match = tabularRegex.exec(textWithoutTables)) !== null) {
            const tableSpec = match[1].replace(/[{}]/g, '');
            const tableContent = match[2];
            const marker = `${CONFIG.MARKER_PREFIX}TABLE_${tableIdx}__`;
            
            tables.push({ 
                marker, 
                spec: tableSpec, 
                content: tableContent, 
                caption: '',
                index: tableIdx + 1,
            });
            
            textWithoutTables = textWithoutTables.replace(match[0], `\n\n${marker}\n\n`);
            tableIdx++;
        }

        return textWithoutTables;
    }

    extractSections(text, sections) {
        // Try chapters first
        const chapterRegex = /\\chapter(?:\*)?(?:\[[^\]]*\])?\{([^}]+)\}([\s\S]*?)(?=\\chapter|$)/g;
        let match;
        let foundChapters = false;

        while ((match = chapterRegex.exec(text)) !== null) {
            foundChapters = true;
            const title = this.cleanText(match[1]);
            const content = match[2];
            const processedContent = this.processContent(content);
            
            if (processedContent.trim()) {
                sections.push({
                    title,
                    content: processedContent,
                    level: 1,
                    mathStore: [...this.mathStore],
                });
            }
        }

        // If no chapters, look for sections
        if (!foundChapters) {
            const sectionRegex = /\\section(?:\*)?(?:\[[^\]]*\])?\{([^}]+)\}([\s\S]*?)(?=\\section|$)/g;

            while ((match = sectionRegex.exec(text)) !== null) {
                const title = this.cleanText(match[1]);
                const content = match[2];
                const processedContent = this.processContent(content);
                
                if (processedContent.trim()) {
                    sections.push({
                        title,
                        content: processedContent,
                        level: 2,
                        mathStore: [...this.mathStore],
                    });
                }
            }
        }

        // No structure found
        if (sections.length === 0) {
            const processedContent = this.processContent(text);
            if (processedContent.trim()) {
                sections.push({
                    title: 'Content',
                    content: processedContent,
                    level: 2,
                    mathStore: [...this.mathStore],
                });
            }
        }
    }

    processContent(content) {
        this.mathStore = [];
        this.mathIndex = 0;

        content = this.maskMathExpressions(content);
        content = this.processEnvironments(content);
        content = this.processSubsections(content);
        content = this.processTextFormatting(content);
        content = this.cleanLatexCommands(content);
        content = this.cleanWhitespace(content);

        return content;
    }

    maskMathExpressions(text) {
        // Display math: \[...\]
        text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
            const marker = `DISPLAYMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: true });
            return `\n\n${marker}\n\n`;
        });

        // Display math: $$...$$
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
            const marker = `DISPLAYMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: true });
            return `\n\n${marker}\n\n`;
        });

        // Display math: equation environment
        text = text.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (match, mathContent) => {
            const marker = `DISPLAYMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: true });
            return `\n\n${marker}\n\n`;
        });

        // Display math: align environment
        text = text.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match, mathContent) => {
            const marker = `DISPLAYMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: true });
            return `\n\n${marker}\n\n`;
        });

        // Inline math: \(...\)
        text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
            const marker = `INLINEMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: false });
            return ` ${marker} `;
        });

        // Inline math: $...$
        text = text.replace(/\$([^\$\n]+)\$/g, (match, mathContent) => {
            const marker = `INLINEMATH_${this.mathIndex++}`;
            this.mathStore.push({ marker, content: mathContent.trim(), display: false });
            return ` ${marker} `;
        });

        return text;
    }

    processEnvironments(text) {
        // Itemize
        text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, content) => {
            const items = content.split(/\\item\s+/).filter(item => item.trim());
            return '\n\nITEMIZE_START\n' + items.map(item => `ITEM_${item.trim()}`).join('\n') + '\nITEMIZE_END\n\n';
        });

        // Enumerate
        text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (match, content) => {
            const items = content.split(/\\item\s+/).filter(item => item.trim());
            return '\n\nENUMERATE_START\n' + items.map((item, idx) => `ENUMITEM_${idx + 1}_${item.trim()}`).join('\n') + '\nENUMERATE_END\n\n';
        });

        // Quote
        text = text.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (match, content) => {
            return `\n\nBLOCKQUOTE_START\n${content.trim()}\nBLOCKQUOTE_END\n\n`;
        });

        // Verbatim
        text = text.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (match, content) => {
            return `\n\nCODE_START\n${content}\nCODE_END\n\n`;
        });

        return text;
    }

    processSubsections(text) {
        text = text.replace(/\\subsection(?:\*)?(?:\[[^\]]*\])?\{([^}]+)\}/g, (match, title) => {
            return `\n\nSUBSECTION_${this.cleanText(title)}_SUBSECTION\n\n`;
        });

        text = text.replace(/\\subsubsection(?:\*)?(?:\[[^\]]*\])?\{([^}]+)\}/g, (match, title) => {
            return `\n\nSUBSUBSECTION_${this.cleanText(title)}_SUBSUBSECTION\n\n`;
        });

        return text;
    }

    processTextFormatting(text) {
        // Line breaks
        text = text.replace(/\\\\/g, ' ');
        text = text.replace(/(^|\s)\/(\s|$)/g, ' ');

        // Bold
        text = text.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
        text = text.replace(/\{\\bf\s+([^}]+)\}/g, '**$1**');

        // Italic
        text = text.replace(/\\textit\{([^}]+)\}/g, '*$1*');
        text = text.replace(/\\emph\{([^}]+)\}/g, '*$1*');
        text = text.replace(/\{\\it\s+([^}]+)\}/g, '*$1*');

        // Underline
        text = text.replace(/\\underline\{([^}]+)\}/g, '__$1__');

        // Typewriter
        text = text.replace(/\\texttt\{([^}]+)\}/g, '`$1`');

        // Special characters
        text = text.replace(/\\texttrademark/g, '™');
        text = text.replace(/\\textregistered/g, '®');
        text = text.replace(/\\textcopyright/g, '©');
        text = text.replace(/\\textsection/g, '§');
        text = text.replace(/\\textparagraph/g, '¶');

        // Quotes
        text = text.replace(/``/g, '"');
        text = text.replace(/''/g, '"');

        // Superscript and subscript
        text = text.replace(/\\textsuperscript\{([^}]+)\}/g, '[[SUP:$1]]');
        text = text.replace(/\\textsubscript\{([^}]+)\}/g, '[[SUB:$1]]');

        return text;
    }

    cleanLatexCommands(text) {
        // Page breaks
        text = text
            .replace(/\\newpage/g, '\n\n')
            .replace(/\\clearpage/g, '\n\n')
            .replace(/\\pagebreak/g, '\n\n');

        // Spacing
        text = text
            .replace(/\\vspace\*?\{[^}]+\}/g, '')
            .replace(/\\hspace\*?\{[^}]+\}/g, ' ')
            .replace(/\\noindent/g, '')
            .replace(/\\indent/g, '    ');

        // Line breaks
        text = text.replace(/\\\\\s*(?:\[[^\]]*\])?/g, '\n');

        // Non-breaking space
        text = text.replace(/~/g, ' ');

        // Remove nested braces (optimized iterations)
        let prevText;
        let iterations = 0;
        const MAX_ITERATIONS = 5;
        
        do {
            prevText = text;
            text = text.replace(/\\[a-zA-Z]+\*?\{([^{}]*)\}/g, '$1');
            text = text.replace(/\\[a-zA-Z]+\*?\[[^\]]*\]\{([^{}]*)\}/g, '$1');
            iterations++;
        } while (text !== prevText && iterations < MAX_ITERATIONS);

        // Remove standalone commands
        text = text.replace(/\\[a-zA-Z]+\*?/g, '');

        return text;
    }

    cleanWhitespace(text) {
        return text
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    cleanText(text) {
        return text
            .replace(/\\textbf\{([^}]+)\}/g, '$1')
            .replace(/\\textit\{([^}]+)\}/g, '$1')
            .replace(/\\emph\{([^}]+)\}/g, '$1')
            .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1')
            .replace(/\\[a-zA-Z]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

/**
 * Enhanced Text Renderer with better typography
 */
const TextRenderer = ({ text, mathStore = [] }) => {
    if (!text) return null;

    const parts = [];
    let currentPos = 0;

    // Enhanced pattern with subscript support
    const pattern = /(DISPLAYMATH_\d+)|(INLINEMATH_\d+)|(SUBSECTION_(.+?)_SUBSECTION)|(SUBSUBSECTION_(.+?)_SUBSUBSECTION)|(BLOCKQUOTE_START)|(BLOCKQUOTE_END)|(CODE_START)|(CODE_END)|(ITEMIZE_START)|(ITEMIZE_END)|(ENUMERATE_START)|(ENUMERATE_END)|(ITEM_)|(ENUMITEM_\d+_)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(__(.+?)__)|(`(.+?)`)|(\[\[SUP:([^\]]+)\]\])|(\[\[SUB:([^\]]+)\]\])/g;

    let match;
    let inBlockQuote = false;
    let inCodeBlock = false;
    let inItemize = false;
    let inEnumerate = false;
    let blockQuoteContent = '';
    let codeContent = '';
    let listItems = [];

    while ((match = pattern.exec(text)) !== null) {
        // Add text before match
        if (match.index > currentPos && !inBlockQuote && !inCodeBlock && !inItemize && !inEnumerate) {
            const textBefore = text.substring(currentPos, match.index);
            if (textBefore.trim()) {
                parts.push(<span key={`t-${currentPos}`}>{textBefore}</span>);
            }
        }

        if (inBlockQuote) {
            if (match[8]) { // BLOCKQUOTE_END
                inBlockQuote = false;
                parts.push(
                    <blockquote key={`bq-${match.index}`} className="border-l-4 border-blue-500 pl-6 pr-4 py-3 my-6 italic text-gray-700 bg-blue-50 rounded-r">
                        <TextRenderer text={blockQuoteContent.trim()} mathStore={mathStore} />
                    </blockquote>
                );
                blockQuoteContent = '';
            } else {
                blockQuoteContent += text.substring(currentPos, pattern.lastIndex);
            }
        } else if (inCodeBlock) {
            if (match[9]) { // CODE_END
                inCodeBlock = false;
                parts.push(
                    <pre key={`code-${match.index}`} className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto my-6 shadow-inner">
                        <code>{codeContent}</code>
                    </pre>
                );
                codeContent = '';
            } else {
                codeContent += text.substring(currentPos, pattern.lastIndex);
            }
        } else if (inItemize) {
            if (match[11]) { // ITEMIZE_END
                inItemize = false;
                parts.push(
                    <ul key={`ul-${match.index}`} className="list-disc list-outside space-y-2 text-gray-800 leading-relaxed mb-6 ml-8">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="pl-2">
                                <TextRenderer text={item} mathStore={mathStore} />
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
            } else if (match[14]) { // ITEM_
                const itemText = text.substring(pattern.lastIndex, text.indexOf('\n', pattern.lastIndex)).trim();
                listItems.push(itemText);
            }
        } else if (inEnumerate) {
            if (match[13]) { // ENUMERATE_END
                inEnumerate = false;
                parts.push(
                    <ol key={`ol-${match.index}`} className="list-decimal list-outside space-y-2 text-gray-800 leading-relaxed mb-6 ml-8">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="pl-2">
                                <TextRenderer text={item} mathStore={mathStore} />
                            </li>
                        ))}
                    </ol>
                );
                listItems = [];
            } else if (match[15]) { // ENUMITEM_
                const itemMatch = text.substring(pattern.lastIndex - match[0].length).match(/ENUMITEM_\d+_(.+?)(?=\n|ENUMITEM_|ENUMERATE_END)/);
                if (itemMatch) {
                    listItems.push(itemMatch[1].trim());
                }
            }
        } else if (match[1]) { // Display math
            const mathData = mathStore.find(m => m.marker === match[1]);
            if (mathData) {
                parts.push(<MathRenderer key={`dm-${match.index}`} latex={mathData.content} displayMode={true} />);
            }
        } else if (match[2]) { // Inline math
            const mathData = mathStore.find(m => m.marker === match[2]);
            if (mathData) {
                parts.push(<MathRenderer key={`im-${match.index}`} latex={mathData.content} displayMode={false} />);
            }
        } else if (match[3]) { // Subsection
            parts.push(
                <h3 key={`sub-${match.index}`} className="text-xl font-semibold text-gray-900 mt-8 mb-4 border-b-2 border-gray-200 pb-2">
                    {match[4]}
                </h3>
            );
        } else if (match[5]) { // Subsubsection
            parts.push(
                <h4 key={`subsub-${match.index}`} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
                    {match[6]}
                </h4>
            );
        } else if (match[7]) { // BLOCKQUOTE_START
            inBlockQuote = true;
        } else if (match[9]) { // CODE_START
            inCodeBlock = true;
        } else if (match[10]) { // ITEMIZE_START
            inItemize = true;
            listItems = [];
        } else if (match[12]) { // ENUMERATE_START
            inEnumerate = true;
            listItems = [];
        } else if (match[16]) { // Bold
            parts.push(<strong key={`b-${match.index}`} className="font-semibold text-gray-900">{match[17]}</strong>);
        } else if (match[18]) { // Italic
            parts.push(<em key={`i-${match.index}`} className="italic">{match[19]}</em>);
        } else if (match[20]) { // Underline
            parts.push(<u key={`u-${match.index}`} className="underline decoration-2">{match[21]}</u>);
        } else if (match[22]) { // Code
            parts.push(
                <code key={`c-${match.index}`} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm font-mono">
                    {match[23]}
                </code>
            );
        } else if (match[24]) { // Superscript
            parts.push(<sup key={`sup-${match.index}`} className="text-xs">{match[25]}</sup>);
        } else if (match[26]) { // Subscript
            parts.push(<sub key={`sub-${match.index}`} className="text-xs">{match[27]}</sub>);
        }

        currentPos = pattern.lastIndex;
    }

    // Add remaining text
    if (currentPos < text.length && !inBlockQuote && !inCodeBlock && !inItemize && !inEnumerate) {
        const remaining = text.substring(currentPos);
        if (remaining.trim()) {
            parts.push(<span key={`t-${currentPos}`}>{remaining}</span>);
        }
    }

    return parts.length > 0 ? <>{parts}</> : text;
};

/**
 * Enhanced Table Renderer with better styling
 */
const TableRenderer = ({ table }) => {
    const processTableContent = (content, spec) => {
        // Process content
        let processedContent = content
            .replace(/\\toprule/g, '\nTOPRULE')
            .replace(/\\midrule/g, '\nMIDRULE')
            .replace(/\\bottomrule/g, '\nBOTTOMRULE')
            .replace(/\\hline/g, '\nHLINE')
            .replace(/\\cline\{[^}]+\}/g, '');

        const lines = processedContent
            .split(/\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let headerRows = [];
        let bodyRows = [];
        let inHeader = false;
        let inBody = false;

        for (const line of lines) {
            if (line === 'TOPRULE' || line === 'HLINE') {
                inHeader = true;
                continue;
            }
            if (line === 'MIDRULE') {
                inHeader = false;
                inBody = true;
                continue;
            }
            if (line === 'BOTTOMRULE') {
                break;
            }

            const cells = line
                .split('&')
                .map(cell => cell.replace(/\\\\/g, '').trim());

            if (inHeader) {
                headerRows.push(cells);
            } else if (inBody) {
                bodyRows.push(cells);
            } else {
                if (headerRows.length === 0) {
                    headerRows.push(cells);
                } else {
                    bodyRows.push(cells);
                }
            }
        }

        return { headerRows, bodyRows };
    };

    const { headerRows, bodyRows } = processTableContent(table.content, table.spec);

    return (
        <div className="my-8">
            {table.caption && (
                <div className="text-center text-gray-800 font-semibold mb-3 text-sm">
                    Table {table.index}: {table.caption}
                </div>
            )}
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="w-full border-collapse bg-white">
                    {headerRows.length > 0 && (
                        <thead>
                            {headerRows.map((cells, i) => (
                                <tr key={i} className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                                    {cells.map((cell, j) => (
                                        <th key={j} className="px-6 py-3 text-sm font-bold text-gray-900 text-center border-r border-gray-200 last:border-r-0">
                                            {cell}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                    )}
                    <tbody>
                        {bodyRows.map((cells, i) => (
                            <tr key={i} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                {cells.map((cell, j) => (
                                    <td key={j} className="px-6 py-3 text-sm text-gray-800 text-center border-r border-gray-100 last:border-r-0">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * Enhanced Page Card with better typography
 */
const PageCard = ({ children, pageNumber }) => {
    return (
        <article
            className="relative bg-white shadow-xl mx-auto mb-12 rounded-sm"
            style={{
                width: `${CONFIG.PAGE_WIDTH_INCHES}in`,
                minHeight: `${CONFIG.PAGE_HEIGHT_INCHES}in`,
                padding: `${CONFIG.PAGE_PADDING_INCHES}in`,
                fontFamily: '"Crimson Pro", "Crimson Text", "Libre Baskerville", "Georgia", serif',
                fontSize: '11pt',
                lineHeight: '1.6',
            }}
            aria-label={`Page ${pageNumber}`}
            role="region"
        >
            <div className="h-full">{children}</div>
            <div className="absolute bottom-6 right-8 text-xs text-gray-400 font-sans">
                {pageNumber}
            </div>
        </article>
    );
};

/**
 * Content Element Renderer
 */
const ContentElement = React.memo(({ element, tables = [] }) => {
    const { type, content, mathStore, level, key } = element;

    switch (type) {
        case 'title-page':
            return (
                <div key={key} className="flex flex-col items-center justify-center h-full">
                    <h1 className="text-6xl font-bold text-gray-900 mb-10 text-center leading-tight" style={{ fontFamily: '"Playfair Display", "Crimson Pro", serif' }}>
                        {content.title}
                    </h1>
                    {content.author && (
                        <p className="text-2xl text-gray-700 mb-6 font-medium">{content.author}</p>
                    )}
                    {content.date && (
                        <p className="text-lg text-gray-600 mb-8">{content.date}</p>
                    )}
                    {content.abstract && (
                        <div className="mt-12 max-w-3xl">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Abstract</h2>
                            <p className="text-sm text-gray-700 leading-relaxed text-justify italic">
                                {content.abstract}
                            </p>
                        </div>
                    )}
                </div>
            );

        case 'section-heading':
            const HeadingTag = level === 1 ? 'h1' : 'h2';
            const headingClass = level === 1
                ? 'text-4xl font-bold text-gray-900 border-b-4 border-gray-800 pb-4 mt-12 mb-8'
                : 'text-3xl font-bold text-gray-900 border-b-2 border-gray-400 pb-3 mt-10 mb-6';

            return (
                <HeadingTag key={key} className={headingClass} style={{ fontFamily: '"Playfair Display", "Crimson Pro", serif' }}>
                    {content}
                </HeadingTag>
            );

        case 'table':
            const table = tables.find(t => t.marker === content);
            return table ? <TableRenderer key={key} table={table} /> : null;

        case 'paragraph':
            if (typeof content === 'string' && content.startsWith(CONFIG.MARKER_PREFIX)) {
                const table = tables.find(t => t.marker === content);
                return table ? <TableRenderer key={key} table={table} /> : null;
            }

            // Improved paragraph formatting for readability and typographic quality
            return (
                <p
                    key={key}
                    className="text-gray-800 mb-6 max-w-3xl mx-auto text-justify hyphens-auto"
                    style={{
                        fontSize: '1.08rem',
                        lineHeight: '1.85',
                        textIndent: '2em',
                        letterSpacing: '0.01em',
                        wordBreak: 'break-word',
                        background: 'rgba(248,250,252,0.6)', // subtle bg
                        borderRadius: '0.25rem',
                        padding: '0.5em 1em',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        marginBottom: '1.5em',
                    }}
                >
                    <span style={{ display: 'block', textAlign: 'justify' }}>
                        <TextRenderer text={content} mathStore={mathStore} />
                    </span>
                </p>
            );

        default:
            return null;
    }
});

ContentElement.displayName = 'ContentElement';

/**
 * Main LaTeX Preview Component
 */
export default function LatexPreview({ latexContent, viewMode = 'preview' }) {
    // Debug output: log the latexContent prop
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('[LatexPreview] latexContent:', latexContent);
    }, [latexContent]);

    // Parse LaTeX content (always attempt, even if empty)
    const parsed = useMemo(() => {
        const parser = new LatexParser(latexContent || '');
        return parser.parse();
    }, [latexContent]);

    // Build pages
    const pages = useMemo(() => {
        const result = [];

        // Title page
        if (parsed.metadata.title) {
            result.push([
                { type: 'title-page', content: parsed.metadata, key: 'title-page' }
            ]);
        }

        // Section pages
        parsed.sections.forEach((section, sectionIdx) => {
            const elements = [];
            
            elements.push({
                type: 'section-heading',
                content: section.title,
                level: section.level,
                key: `section-${sectionIdx}`,
            });

            const paragraphs = section.content.split(/\n\n/).filter(p => p.trim());
            
            paragraphs.forEach((para, pIdx) => {
                if (para.startsWith(CONFIG.MARKER_PREFIX)) {
                    elements.push({
                        type: 'table',
                        content: para.trim(),
                        key: `section-${sectionIdx}-table-${pIdx}`,
                    });
                } else {
                    elements.push({
                        type: 'paragraph',
                        content: para,
                        mathStore: section.mathStore,
                        key: `section-${sectionIdx}-p${pIdx}`,
                    });
                }
            });

            result.push(elements);
        });

        return result.length > 0 ? result : [[]];
    }, [parsed]);

    // Always show the preview, even if latexContent is empty
    return (
        <div className="min-h-screen">
            {viewMode === 'preview' ? (
                <div className="bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 py-12 px-4">
                    {/* Document info bar */}
                    <div className="max-w-4xl mx-auto mb-8 bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium">{pages.length} {pages.length === 1 ? 'page' : 'pages'}</span>
                            </div>
                            {parsed.metadata.title && (
                                <div className="h-4 w-px bg-gray-300" />
                            )}
                            {parsed.metadata.title && (
                                <span className="text-sm font-semibold text-gray-800 truncate max-w-md">
                                    {parsed.metadata.title}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                            LaTeX Document
                        </div>
                    </div>

                    {/* Pages */}
                    <div className="max-w-screen-xl mx-auto">
                        {pages.map((pageContent, pageIndex) => (
                            <PageCard key={pageIndex} pageNumber={pageIndex + 1}>
                                {pageContent.map((element) => (
                                    <ContentElement 
                                        key={element.key} 
                                        element={element} 
                                        tables={parsed.tables} 
                                    />
                                ))}
                            </PageCard>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-gray-900 min-h-screen p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-gray-800 rounded-lg p-1 mb-4">
                            <div className="text-xs text-gray-400 font-mono px-3 py-2 border-b border-gray-700">
                                LaTeX Source Code
                            </div>
                        </div>
                        <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-2xl leading-relaxed">
                            {latexContent}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}