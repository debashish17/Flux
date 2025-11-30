
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Download, RefreshCw, Loader2, MessageSquare, Menu, X, Sparkles, Home, Check, ArrowUpDown } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import SectionFeedback from '../components/SectionFeedback';
import SectionRefinementHistory from '../components/SectionRefinementHistory';
import SectionReorder from '../components/SectionReorder';
import { errorToast, successToast } from '../utils/toast';
import { useProject } from '../hooks/useProject';
import { useUpdateSection } from '../hooks/useSections';
import { useGenerateSection, useRegenerateWithFeedback } from '../hooks/useGeneration';
import { useExportProject } from '../hooks/useExport';
import { debounce } from 'lodash';

export default function PresentationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: project, isLoading } = useProject(id);
  const updateSection = useUpdateSection();
  const generateSectionMutation = useGenerateSection();
  const regenerateWithFeedback = useRegenerateWithFeedback();
  const exportProject = useExportProject();
  const [chatOpen, setChatOpen] = useState(false);
  const [slidesOpen, setSlidesOpen] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showReorder, setShowReorder] = useState(false);
  const [generatingSlides, setGeneratingSlides] = useState(new Set());
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenNotice, setAutoGenNotice] = useState("");
  const [feedbackCache, setFeedbackCache] = useState({}); // Cache feedback for all sections

  // Editing states
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingBullet, setEditingBullet] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [tempTitle, setTempTitle] = useState("");
  const [tempBullet, setTempBullet] = useState("");
  const [tempImage, setTempImage] = useState("");

  // Debounced section update function to reduce API calls
  const debouncedSectionUpdate = useCallback(
    debounce((sectionId, updates) => {
      updateSection.mutate({ sectionId, updates, projectId: parseInt(id) });
    }, 1000), // Wait 1 second after last edit
    [id]
  );

  // Auto-generate content for empty sections on mount
  useEffect(() => {
    if (project && project.type === 'pptx' && project.sections.length > 0) {
      const emptySections = project.sections.filter(s => !s.content || s.content.trim() === '');
      if (emptySections.length > 0) {
        startAutoGeneration(emptySections);
      }
    }
  }, [project?.id]); // Only run when project ID changes

  // AI auto-generation batching logic
  const startAutoGeneration = async (emptySections) => {
    setAutoGenerating(true);
    const totalSlides = emptySections.length;
    setAutoGenNotice(`AI is generating content for ${totalSlides} slide${totalSlides > 1 ? 's' : ''}...`);

    let failedSlides = [];

    // Process slides in batches of 10
    const batchSize = 10;
    for (let batchStart = 0; batchStart < emptySections.length; batchStart += batchSize) {
      const batch = emptySections.slice(batchStart, batchStart + batchSize);
      const batchNum = Math.floor(batchStart / batchSize) + 1;
      const totalBatches = Math.ceil(emptySections.length / batchSize);

      setAutoGenNotice(`Generating batch ${batchNum} of ${totalBatches} (${batch.length} slides)...`);

      for (let i = 0; i < batch.length; i++) {
        const section = batch[i];
        let retries = 3;
        let success = false;

        while (retries > 0 && !success) {
          try {
            await generateSectionMutation.mutateAsync({
              sectionId: section.id,
              projectId: parseInt(id)
            });
            success = true;
          } catch (error) {
            retries--;
            console.error(`Failed to generate section ${section.title} (${3 - retries}/3 attempts)`, error);
            if (retries > 0) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              // Failed after all retries
              failedSlides.push(section.title);
            }
          }
        }

        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      if (batchStart + batchSize < emptySections.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    setAutoGenerating(false);

    // Invalidate dashboard cache
    queryClient.invalidateQueries(['projects']);

    if (failedSlides.length > 0) {
      setAutoGenNotice(`Generation completed with ${failedSlides.length} failed slide(s). Refresh to retry.`);
      setTimeout(() => setAutoGenNotice(""), 5000);
    } else {
      setAutoGenNotice("All slides generated successfully!");
      setTimeout(() => setAutoGenNotice(""), 3000);
    }
  };
  // Scroll tracking for active slide with debouncing for better performance
  const scrollTimerRef = useRef(null);
  useEffect(() => {
    const handleScroll = () => {
      // Clear existing timer
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      // Set new timer - update active slide 100ms after scrolling stops
      scrollTimerRef.current = setTimeout(() => {
        const slideElements = document.querySelectorAll('.slide-card');
        let closestSlide = 0;
        let closestDistance = Infinity;
        slideElements.forEach((el, idx) => {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - 100);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestSlide = idx;
          }
        });
        setActiveSlide(closestSlide);
      }, 100);
    };

    const scrollContainer = document.getElementById('slides-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }
      };
    }
  }, []);

  const parseSlideContent = (content) => {
    if (!content) return { title: '', bullets: [], imageSuggestion: '' };
    const result = { title: '', bullets: [], imageSuggestion: '' };
    const lines = content.split('\n');
    let inContentSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TITLE:')) {
        result.title = trimmed.replace('TITLE:', '').trim();
      } else if (trimmed.startsWith('CONTENT:')) {
        inContentSection = true;
      } else if (trimmed.startsWith('IMAGE_SUGGESTION:')) {
        result.imageSuggestion = trimmed.replace('IMAGE_SUGGESTION:', '').trim();
        inContentSection = false;
      } else if (inContentSection && trimmed) {
        const bullet = trimmed.replace(/^[•\-*]\s*/, '');
        if (bullet) result.bullets.push(bullet);
      }
    }
    return result;
  };

  const reconstructContent = (parsed) => {
    let content = `TITLE: ${parsed.title}\nCONTENT:\n`;
    parsed.bullets.forEach(bullet => {
      content += `• ${bullet}\n`;
    });
    if (parsed.imageSuggestion) {
      content += `IMAGE_SUGGESTION: ${parsed.imageSuggestion}`;
    }
    return content;
  };

  // Memoize parsed slides to avoid re-parsing on every render - significant performance improvement
  const parsedSlides = useMemo(() => {
    if (!project || !project.sections) return {};
    const parsed = {};
    project.sections.forEach(section => {
      parsed[section.id] = parseSlideContent(section.content);
    });
    return parsed;
  }, [project?.sections]);

  const handleTitleEdit = (sectionId, newTitle) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.title = newTitle;
    const updatedContent = reconstructContent(parsed);

    // Optimistic update - update cache immediately
    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
      if (!old || !old.sections) return old;
      return {
        ...old,
        sections: old.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent, title: newTitle } : s
        )
      };
    });

    // Debounced API call
    debouncedSectionUpdate(sectionId, { title: newTitle, content: updatedContent });
  };

  const handleBulletEdit = (sectionId, bulletIndex, newText) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets[bulletIndex] = newText;
    const updatedContent = reconstructContent(parsed);

    // Optimistic update
    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
      if (!old || !old.sections) return old;
      return {
        ...old,
        sections: old.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      };
    });

    // Debounced API call
    debouncedSectionUpdate(sectionId, { content: updatedContent });
  };

  const handleBulletDelete = (sectionId, bulletIndex) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets.splice(bulletIndex, 1);
    const updatedContent = reconstructContent(parsed);

    // Optimistic update
    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
      if (!old || !old.sections) return old;
      return {
        ...old,
        sections: old.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      };
    });

    // Debounced API call
    debouncedSectionUpdate(sectionId, { content: updatedContent });
  };

  const handleBulletAdd = (sectionId) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets.push('New bullet point');
    const updatedContent = reconstructContent(parsed);

    // Optimistic update
    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
      if (!old || !old.sections) return old;
      return {
        ...old,
        sections: old.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      };
    });

    // Immediate API call (not debounced for adding new items)
    updateSection.mutate({ sectionId, updates: { content: updatedContent }, projectId: parseInt(id) });
  };

  const handleImageEdit = (sectionId, newImage) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.imageSuggestion = newImage;
    const updatedContent = reconstructContent(parsed);

    // Optimistic update
    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
      if (!old || !old.sections) return old;
      return {
        ...old,
        sections: old.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      };
    });

    // Debounced API call
    debouncedSectionUpdate(sectionId, { content: updatedContent });
  };

  const startTitleEdit = (sectionId, currentTitle) => {
    setEditingTitle(sectionId);
    setTempTitle(currentTitle);
  };

  const saveTitleEdit = (sectionId, autoSave = false) => {
    if (tempTitle.trim()) {
      handleTitleEdit(sectionId, tempTitle.trim());
    }
    if (autoSave) {
      setEditingTitle(null);
      setTempTitle("");
    }
  };

  const startBulletEdit = (sectionId, bulletIndex, currentText) => {
    setEditingBullet(`${sectionId}-${bulletIndex}`);
    setTempBullet(currentText);
  };

  const saveBulletEdit = (sectionId, bulletIndex, autoSave = false) => {
    if (tempBullet.trim()) {
      handleBulletEdit(sectionId, bulletIndex, tempBullet.trim());
    }
    if (autoSave) {
      setEditingBullet(null);
      setTempBullet("");
    }
  };

  const startImageEdit = (sectionId, currentImage) => {
    setEditingImage(sectionId);
    setTempImage(currentImage);
  };

  const saveImageEdit = (sectionId, autoSave = false) => {
    handleImageEdit(sectionId, tempImage.trim());
    if (autoSave) {
      setEditingImage(null);
      setTempImage("");
    }
  };

  const handleFeedbackChange = (sectionId, newFeedbackType) => {
    setFeedbackCache(prev => ({
      ...prev,
      [sectionId]: { userFeedback: newFeedbackType }
    }));
  };

  const handleGenerate = async (sectionId) => {
    // Check cached feedback first (avoid extra API call)
    const cachedFeedback = feedbackCache[sectionId]?.userFeedback;

    // If user liked the slide, show warning and prevent regeneration
    if (cachedFeedback === 'LIKE') {
      const confirmRegenerate = window.confirm(
        "You marked this slide as 'liked'. Regenerating will create new content. Are you sure you want to continue?"
      );
      if (!confirmRegenerate) {
        return; // User cancelled, don't regenerate
      }
    }

    setGeneratingSlides(prev => new Set(prev).add(sectionId));

    const isRegeneratingWithFeedback = cachedFeedback === 'DISLIKE';

    try {
      if (isRegeneratingWithFeedback) {
        // Show notice that we're applying feedback
        setAutoGenNotice("Applying your feedback...");

        // Regenerate with feedback using the hook
        await regenerateWithFeedback.mutateAsync({
          sectionId,
          feedback: '', // Backend will fetch comments from database
          projectId: parseInt(id)
        });

        // Clear feedback cache - backend deletes the feedback record
        setFeedbackCache(prev => ({
          ...prev,
          [sectionId]: { userFeedback: null }
        }));

        setAutoGenNotice("Slide regenerated with your feedback!");
        setTimeout(() => setAutoGenNotice(""), 3000);
      } else {
        // No dislike feedback, do regular generation
        await generateSectionMutation.mutateAsync({
          sectionId,
          projectId: parseInt(id)
        });
      }
    } catch (error) {
      console.error('Generation failed', error);
      setAutoGenNotice("Failed to regenerate slide");
      setTimeout(() => setAutoGenNotice(""), 3000);
    } finally {
      setGeneratingSlides(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    exportProject.mutate(
      {
        projectId: parseInt(id),
        title: project.title,
        type: project.type
      },
      {
        onSuccess: () => {
          successToast('Presentation exported successfully!');
        },
        onError: (error) => {
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to export presentation';
          errorToast(`Export failed: ${errorMessage}`);
        }
      }
    );
  };

  const handleReorderSections = async (newOrder) => {
    try {
      await api.patch(`/projects/${id}/sections/reorder`, { sectionOrder: newOrder });
      queryClient.invalidateQueries(['projects', parseInt(id)]);
      successToast('Sections reordered successfully!');
      setShowReorder(false);
    } catch (error) {
      errorToast('Failed to reorder sections');
      console.error('Reorder error:', error);
    }
  };

  const scrollToSlide = (index) => {
    const slideElement = document.getElementById(`slide-${index}`);
    if (slideElement) {
      slideElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading || !project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      {autoGenNotice && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3">
          {autoGenerating && <Loader2 className="w-5 h-5 animate-spin" />}
          <span className="font-medium">{autoGenNotice}</span>
        </div>
      )}

      <div className="h-screen bg-white flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to Dashboard"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">{project.title}</h1>
            </div>
          </div>
        
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReorder(true)}
              className="px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 text-gray-700"
            >
              <ArrowUpDown className="w-4 h-4" />
              Reorder
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 text-gray-700"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={handleExport}
              disabled={exportProject.isPending}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 text-white disabled:opacity-50"
            >
              {exportProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Slide Navigation */}
          {slidesOpen && (
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Slides ({project.sections.length})</h2>
                <button
                  onClick={() => setSlidesOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {project.sections.map((section, idx) => {
                  const parsed = parsedSlides[section.id] || { title: '', bullets: [], imageSuggestion: '' };
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSlide(idx)}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        idx === activeSlide
                          ? 'bg-white border-indigo-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                          idx === activeSlide ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {parsed.title || section.title}
                          </div>
                          {section.content && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {parsed.bullets[0] || 'Empty slide'}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Center - Scrollable Slides */}
          <div 
            id="slides-container"
            className="flex-1 overflow-y-auto bg-gray-50"
          >
            {!slidesOpen && (
              <div className="fixed top-16 left-4 z-10">
                <button
                  onClick={() => setSlidesOpen(true)}
                  className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}

            <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
              {project.sections.map((section, idx) => {
                const parsed = parsedSlides[section.id] || { title: '', bullets: [], imageSuggestion: '' };
                return (
                  <div
                    key={section.id}
                    id={`slide-${idx}`}
                    className="slide-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    style={{ minHeight: '500px' }}
                  >
                    {section.content ? (
                      <div className="p-12 relative">
                        {/* Slide Number Badge */}
                        <div className="absolute top-4 left-4 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                          Slide {idx + 1}
                        </div>

                        {/* Regenerate Button */}
                        <button
                          onClick={() => handleGenerate(section.id)}
                          disabled={generatingSlides.has(section.id)}
                          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                          {generatingSlides.has(section.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Regenerate
                            </>
                          )}
                        </button>

                        {/* Slide Content */}
                        <div className="mt-8">
                          {/* Editable Title */}
                          <div className="mb-8">
                            {editingTitle === section.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={tempTitle}
                                  onChange={(e) => setTempTitle(e.target.value)}
                                  onBlur={() => saveTitleEdit(section.id, true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveTitleEdit(section.id, true);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingTitle(null);
                                      setTempTitle("");
                                    }
                                  }}
                                  className="flex-1 text-4xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveTitleEdit(section.id, true)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <h2 
                                className="text-4xl font-bold text-gray-900 cursor-text hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                                onClick={() => startTitleEdit(section.id, parsed.title || section.title)}
                              >
                                {parsed.title || section.title}
                              </h2>
                            )}
                          </div>
                          
                          <div className="flex gap-8">
                            <div className="flex-1">
                              {parsed.bullets.length > 0 ? (
                                <ul className="space-y-4">
                                  {parsed.bullets.map((bullet, bulletIdx) => (
                                    <li key={bulletIdx} className="flex items-start gap-3">
                                      <span className="text-indigo-600 font-bold mt-1 text-xl">•</span>
                                      {editingBullet === `${section.id}-${bulletIdx}` ? (
                                        <div className="flex-1 flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={tempBullet}
                                            onChange={(e) => setTempBullet(e.target.value)}
                                            onBlur={() => saveBulletEdit(section.id, bulletIdx, true)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveBulletEdit(section.id, bulletIdx, true);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingBullet(null);
                                                setTempBullet("");
                                              }
                                            }}
                                            className="flex-1 text-lg text-gray-700 border-b border-indigo-500 focus:outline-none bg-transparent"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => saveBulletEdit(section.id, bulletIdx, true)}
                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span 
                                          className="flex-1 text-lg text-gray-700 leading-relaxed cursor-text hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                                          onClick={() => startBulletEdit(section.id, bulletIdx, bullet)}
                                        >
                                          {bullet}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-400">No content available</p>
                              )}
                              
                              {/* Add Bullet Button */}
                              <button
                                onClick={() => handleBulletAdd(section.id)}
                                className="mt-4 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 border-dashed flex items-center gap-2"
                              >
                                <span className="text-lg">+</span>
                                Add bullet point
                              </button>
                            </div>
                            
                            {/* Editable Image Suggestion */}
                            {(parsed.imageSuggestion || editingImage === section.id) && (
                              <div 
                                className="w-64 h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-300 transition-colors relative"
                                onClick={() => !editingImage && startImageEdit(section.id, parsed.imageSuggestion)}
                              >
                                {editingImage === section.id ? (
                                  <div className="absolute inset-0 p-4 flex flex-col">
                                    <textarea
                                      value={tempImage}
                                      onChange={(e) => setTempImage(e.target.value)}
                                      onBlur={() => saveImageEdit(section.id, true)}
                                      className="flex-1 text-sm text-gray-700 border border-indigo-500 rounded p-2 focus:outline-none resize-none"
                                      placeholder="Describe the image..."
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveImageEdit(section.id, true);
                                      }}
                                      className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400 p-4">
                                    <div className="text-4xl mb-2">📷</div>
                                    <div className="text-xs">{parsed.imageSuggestion}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Feedback Section - key forces re-render when content or feedback changes */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <SectionFeedback
                            key={`feedback-${section.id}`}
                            sectionId={section.id}
                            projectId={parseInt(id)}
                            initialFeedback={feedbackCache[section.id]?.userFeedback}
                            onFeedbackChange={(newType) => handleFeedbackChange(section.id, newType)}
                            historyButton={
                              section.content && (
                                <SectionRefinementHistory
                                  sectionId={section.id}
                                  isOpen={true}
                                  onRestore={(updatedSection) => {
                                    // Update cache with restored section content
                                    queryClient.setQueryData(['projects', parseInt(id)], (old) => {
                                      if (!old || !old.sections) return old;
                                      return {
                                        ...old,
                                        sections: old.sections.map(s =>
                                          s.id === section.id ? { ...s, ...updatedSection } : s
                                        )
                                      };
                                    });
                                  }}
                                  onClose={() => {
                                    // Handled by SectionFeedback toggle
                                  }}
                                />
                              )
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 p-12">
                        <div className="absolute top-4 left-4 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                          Slide {idx + 1}
                        </div>
                        <Sparkles className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="text-lg mb-4 text-gray-500">No content generated yet</p>
                        <button
                          onClick={() => handleGenerate(section.id)}
                          disabled={generatingSlides.has(section.id)}
                          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                          {generatingSlides.has(section.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate Content
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Sidebar */}
          <ChatSidebar projectId={parseInt(id)} isOpen={chatOpen} onClose={() => setChatOpen(false)} />

          {/* Reorder Sidebar */}
          {showReorder && (
            <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold">Reorder Slides</h2>
                <button
                  className="text-gray-400 hover:text-gray-700 text-2xl"
                  onClick={() => setShowReorder(false)}
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <SectionReorder
                  sections={project.sections}
                  onReorder={handleReorderSections}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}