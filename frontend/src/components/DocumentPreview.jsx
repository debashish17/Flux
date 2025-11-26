import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TurndownService from 'turndown';
import SectionFeedback from './SectionFeedback';
import './DocumentPreview.css';

/**
 * DocumentPreview Component
 * Renders HTML preview with inline rich text editing
 * Auto-saves on click outside or Ctrl+S
 */
export default function DocumentPreview({ sections, viewMode = 'preview', projectTitle = '', feedbackCache = {}, onSectionUpdate, onSectionRefresh }) {
  const [editingSection, setEditingSection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Memoize TurndownService to avoid creating new instance on every render
  const turndownService = useMemo(() => new TurndownService(), []);
  const editorWrapperRef = useRef(null);

  // TipTap rich text editor - disabled during save to prevent concurrent edits
  const editor = useEditor({
    extensions: [StarterKit],
    editable: !isSaving,
    content: '',
  }, [isSaving]);
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

  // Handle inline editing
  const startEdit = (sectionId, currentHtmlContent) => {
    setEditingSection(sectionId);

    // Set the editor content to the current HTML
    if (editor) {
      editor.commands.setContent(currentHtmlContent || '');
      editor.commands.focus();
    }
  };

  const saveEdit = async (sectionId) => {
    if (!onSectionUpdate || !editor) {
      cancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      // Get HTML from TipTap editor
      const html = editor.getHTML();

      // Convert HTML to Markdown for backend storage
      const markdown = turndownService.turndown(html);

      // Save to backend
      await onSectionUpdate(sectionId, markdown);

      cancelEdit();
    } catch (error) {
      console.error('Failed to save edit:', error);
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setIsSaving(false);
    if (editor) {
      editor.commands.setContent('');
    }
  };

  // Auto-save on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingSection && editorWrapperRef.current && !editorWrapperRef.current.contains(event.target)) {
        saveEdit(editingSection);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingSection]);

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (editingSection) {
          saveEdit(editingSection);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingSection]);

  // Code view - show raw Markdown (READ-ONLY)
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

        {/* Content Pages - MS Word-style Rich Text Editing */}
        {sections.map((section, idx) => {
          const isEditingThis = editingSection === section.id;

          return (
            <div key={section.id || idx} className="document-page">
              <div className="page-content">
                {section.htmlContent ? (
                  isEditingThis ? (
                    // Editing mode - Rich Text Editor
                    <div className="rendered-content editing-mode" ref={editorWrapperRef}>
                      <div className="bg-white border-2 border-indigo-400 rounded-lg p-4">
                        {/* TipTap Rich Text Editor */}
                        <div className="tiptap-editor-wrapper">
                          <EditorContent
                            editor={editor}
                            className="tiptap-editor-content"
                          />
                        </div>

                        {/* Save hint */}
                        <div className="text-xs text-gray-500 mt-3">
                          {isSaving ? 'Saving...' : 'Press Ctrl+S to save or click outside'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Preview mode - Click to edit (MS Word style)
                    <>
                      <div
                        className="rendered-content editable-preview"
                        onClick={() => onSectionUpdate && startEdit(section.id, section.htmlContent)}
                        style={{ cursor: onSectionUpdate ? 'text' : 'default' }}
                        title={onSectionUpdate ? "Click anywhere to edit" : ""}
                        dangerouslySetInnerHTML={{ __html: section.htmlContent }}
                      />

                      {/* Feedback Section - key forces re-render when content changes */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <SectionFeedback
                          key={`feedback-${section.id}-${section.htmlContent?.substring(0, 50)}`}
                          sectionId={section.id}
                          initialFeedback={feedbackCache[section.id]?.userFeedback}
                        />
                      </div>
                    </>
                  )
                ) : section.content ? (
                  <div className="rendered-content">
                    <h2>{section.title}</h2>
                    <p className="text-gray-500 italic">
                      (HTML preview not available - showing raw content)
                    </p>
                    <pre className="whitespace-pre-wrap">{section.content}</pre>

                    {/* Feedback Section - key forces re-render when content changes */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <SectionFeedback
                        key={`feedback-${section.id}-${section.content?.substring(0, 50)}`}
                        sectionId={section.id}
                        initialFeedback={feedbackCache[section.id]?.userFeedback}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rendered-content">
                    <h2>{section.title}</h2>
                    <p className="text-gray-400 italic">No content generated yet</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
