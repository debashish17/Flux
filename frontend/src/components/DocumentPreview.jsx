import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TurndownService from 'turndown';
import { marked } from 'marked';
import SectionFeedback from './SectionFeedback';
import SectionRefinementHistory from './SectionRefinementHistory';
import './DocumentPreview.css';

/**
 * DocumentPreview Component
 * Renders HTML preview with inline rich text editing
 * Auto-saves on click outside or Ctrl+S
 */
export default function DocumentPreview({ sections, viewMode = 'preview', projectTitle = '', projectId, onSectionUpdate, onSectionRefresh, onFeedbackMapChange }) {
  const [editingSection, setEditingSection] = useState(null);
  const [localSections, setLocalSections] = useState(sections); // Local state for optimistic updates
  const [sectionFeedback, setSectionFeedback] = useState({}); // Track feedback for all sections: { sectionId: { type: 'LIKE'|'DISLIKE', comment: string } }
  // Memoize TurndownService to avoid creating new instance on every render
  const turndownService = useMemo(() => new TurndownService(), []);
  const editorWrapperRef = useRef(null);
  const savingRef = useRef(false); // Track if save is in progress to prevent duplicate calls

  // Update local sections when props change
  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  // Notify parent when feedback map changes
  useEffect(() => {
    if (onFeedbackMapChange) {
      onFeedbackMapChange(sectionFeedback);
    }
  }, [sectionFeedback, onFeedbackMapChange]);

  // TipTap rich text editor - always editable for smooth UX
  const editor = useEditor({
    extensions: [StarterKit],
    editable: true,
    content: '',
  });
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
    localSections.forEach(section => {
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
    // Prevent duplicate saves
    if (savingRef.current) {
      console.log('Save already in progress, skipping...');
      return;
    }

    if (!onSectionUpdate || !editor) {
      cancelEdit();
      return;
    }

    try {
      savingRef.current = true;
      console.log('Saving section:', sectionId);

      // Get HTML from TipTap editor
      const html = editor.getHTML();

      // Convert HTML to Markdown for backend storage
      const markdown = turndownService.turndown(html);

      // Save to backend FIRST
      await onSectionUpdate(sectionId, markdown);

      // Only close editor and update UI after successful save
      cancelEdit();

    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save. Please try again.');
      // Keep editor open so user can retry
    } finally {
      savingRef.current = false;
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    if (editor) {
      editor.commands.setContent('');
    }
  };

  // Auto-save on click outside
  useEffect(() => {
    if (!editingSection) return;

    const handleClickOutside = (event) => {
      if (editorWrapperRef.current && !editorWrapperRef.current.contains(event.target)) {
        saveEdit(editingSection);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSection]); // saveEdit uses latest closure via editingSection dependency

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSection]); // saveEdit uses latest closure via editingSection dependency

  // Code view - show raw Markdown (READ-ONLY)
  if (viewMode === 'code') {
    return (
      <div className="document-code-view">
        <div className="code-container">
          <pre>
            <code>
              {localSections.map((section, idx) => (
                <div key={idx} className="code-section">
                  {section.content || ''}
                  {idx < localSections.length - 1 && '\n\n'}
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
        {localSections.map((section, idx) => {
          const isEditingThis = editingSection === section.id;
          // Convert markdown to HTML on the frontend
          const htmlContent = section.content ? marked(section.content) : '';

          return (
            <div key={section.id || idx} className="document-page">
              <div className="page-content">
                {htmlContent ? (
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
                          Press Ctrl+S to save or click outside
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Preview mode - Click to edit (MS Word style)
                    <>
                      <div
                        className="rendered-content editable-preview"
                        onClick={() => onSectionUpdate && startEdit(section.id, htmlContent)}
                        style={{ cursor: onSectionUpdate ? 'text' : 'default' }}
                        title={onSectionUpdate ? "Click anywhere to edit" : ""}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />

                      {/* Feedback Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <SectionFeedback
                          key={`feedback-${section.id}`}
                          sectionId={section.id}
                          projectId={projectId}
                          onFeedbackChange={(type, comment) => {
                            setSectionFeedback(prev => ({
                              ...prev,
                              [section.id]: type ? { type, comment } : null
                            }));
                          }}
                          historyButton={
                            <SectionRefinementHistory
                              sectionId={section.id}
                              isOpen={true}
                              onRestore={() => {
                                if (onSectionRefresh) {
                                  onSectionRefresh(section.id);
                                }
                              }}
                              onClose={() => {
                                // This will be handled by SectionFeedback's toggle
                              }}
                            />
                          }
                        />
                      </div>
                    </>
                  )
                ) : (
                  <div className="rendered-content">
                    <h2>{section.title}</h2>
                    <p className="text-gray-500 italic">
                      No content generated yet
                    </p>

                    {/* Feedback Section */}
                    <div className="mt-4 pt-4 border-gray-200">
                      <SectionFeedback
                        key={`feedback-${section.id}`}
                        sectionId={section.id}
                        projectId={projectId}
                        onFeedbackChange={(type, comment) => {
                          setSectionFeedback(prev => ({
                            ...prev,
                            [section.id]: type ? { type, comment } : null
                          }));
                        }}
                      />
                    </div>
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
