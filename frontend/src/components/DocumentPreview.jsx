import React from 'react';
import './DocumentPreview.css';

/**
 * DocumentPreview Component
 * Renders HTML preview of markdown-based documents
 * Replaces the complex LaTeX parser with simple, reliable HTML rendering
 */
export default function DocumentPreview({ sections, viewMode = 'preview', projectTitle = '' }) {
  if (!sections || sections.length === 0) {
    return (
      <div className="document-preview-empty">
        <p>No content to preview</p>
      </div>
    );
  }

  // Extract TOC from sections
  const extractTOC = () => {
    const tocEntries = [];
    sections.forEach(section => {
      if (section.content) {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('## ') && !trimmed.startsWith('###')) {
            tocEntries.push({ text: trimmed.substring(3), level: 1 });
          } else if (trimmed.startsWith('### ')) {
            tocEntries.push({ text: trimmed.substring(4), level: 2 });
          }
        });
      }
    });
    return tocEntries;
  };

  // Code view - show raw Markdown
  if (viewMode === 'code') {
    return (
      <div className="document-code-view">
        <div className="code-container">
          <pre>
            <code>
              {sections.map((section, idx) => (
                <div key={idx} className="code-section">
                  {section.content || ''}
                  {idx < sections.length - 1 && '\n\n'}
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  // Preview view - render HTML with title page and TOC
  const tocEntries = extractTOC();
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="document-preview-container">
      <div className="document-pages">
        {/* Title Page */}
        <div className="document-page title-page">
          <div className="page-content">
            <div className="title-page-content">
              <h1 className="document-main-title">{projectTitle}</h1>
              <div className="title-decoration"></div>
              <p className="document-date">Generated on {currentDate}</p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        {tocEntries.length > 0 && (
          <div className="document-page">
            <div className="page-content">
              <h1 className="toc-title">Table of Contents</h1>
              <div className="toc-list">
                {tocEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`toc-entry toc-level-${entry.level}`}
                  >
                    {entry.level === 1 ? '•' : '◦'} {entry.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Pages */}
        {sections.map((section, idx) => (
          <div key={section.id || idx} className="document-page">
            <div className="page-content">
              {section.htmlContent ? (
                <div
                  className="rendered-content"
                  dangerouslySetInnerHTML={{ __html: section.htmlContent }}
                />
              ) : section.content ? (
                <div className="rendered-content">
                  <h2>{section.title}</h2>
                  <p className="text-gray-500 italic">
                    (HTML preview not available - showing raw content)
                  </p>
                  <pre className="whitespace-pre-wrap">{section.content}</pre>
                </div>
              ) : (
                <div className="rendered-content">
                  <h2>{section.title}</h2>
                  <p className="text-gray-400 italic">No content generated yet</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
