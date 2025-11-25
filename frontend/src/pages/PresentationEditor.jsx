
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Download, RefreshCw, Loader2, MessageSquare, Menu, X, Sparkles, Home, Check } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import SectionFeedback from '../components/SectionFeedback';

export default function PresentationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [slidesOpen, setSlidesOpen] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [generatingSlides, setGeneratingSlides] = useState(new Set());
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenNotice, setAutoGenNotice] = useState("");
  
  // Editing states
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingBullet, setEditingBullet] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [tempTitle, setTempTitle] = useState("");
  const [tempBullet, setTempBullet] = useState("");
  const [tempImage, setTempImage] = useState("");

  // Load project from API and auto-generate empty slides
  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      // Auto-generate content for empty sections
      const emptySections = res.data.sections.filter(s => !s.content || s.content.trim() === '');
      if (emptySections.length > 0) {
        startAutoGeneration(emptySections);
      }
    } catch (error) {
      console.error('Failed to load project', error);
    } finally {
      setLoading(false);
    }
  };

  // AI auto-generation batching logic
  const startAutoGeneration = async (emptySections) => {
    setAutoGenerating(true);
    const totalSlides = emptySections.length;
    setAutoGenNotice(`AI is generating content for ${totalSlides} slide${totalSlides > 1 ? 's' : ''}...`);

    // Process slides in batches of 10
    const batchSize = 10;
    for (let batchStart = 0; batchStart < emptySections.length; batchStart += batchSize) {
      const batch = emptySections.slice(batchStart, batchStart + batchSize);
      const batchNum = Math.floor(batchStart / batchSize) + 1;
      const totalBatches = Math.ceil(emptySections.length / batchSize);

      setAutoGenNotice(`Generating batch ${batchNum} of ${totalBatches} (${batch.length} slides)...`);

      for (let i = 0; i < batch.length; i++) {
        const section = batch[i];
        try {
          const res = await api.post(`/generate/section/${section.id}`);
          setProject(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
              s.id === section.id ? { ...s, content: res.data.content } : s
            )
          }));
        } catch (error) {
          console.error(`Failed to generate section ${section.title}`, error);
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
    setAutoGenNotice("All slides generated successfully!");
    setTimeout(() => setAutoGenNotice(""), 3000);
  };
  // Scroll tracking for active slide
  useEffect(() => {
    const handleScroll = () => {
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
    };
    const scrollContainer = document.getElementById('slides-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
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

  const handleTitleEdit = async (sectionId, newTitle) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.title = newTitle;
    const updatedContent = reconstructContent(parsed);
    try {
      await api.patch(`/sections/${sectionId}`, { title: newTitle, content: updatedContent });
      setProject(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent, title: newTitle } : s
        )
      }));
    } catch (error) {
      console.error('Failed to update title', error);
    }
  };

  const handleBulletEdit = async (sectionId, bulletIndex, newText) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets[bulletIndex] = newText;
    const updatedContent = reconstructContent(parsed);
    try {
      await api.patch(`/sections/${sectionId}`, { content: updatedContent });
      setProject(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      }));
    } catch (error) {
      console.error('Failed to update bullet', error);
    }
  };

  const handleBulletDelete = async (sectionId, bulletIndex) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets.splice(bulletIndex, 1);
    const updatedContent = reconstructContent(parsed);
    try {
      await api.patch(`/sections/${sectionId}`, { content: updatedContent });
      setProject(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      }));
    } catch (error) {
      console.error('Failed to delete bullet', error);
    }
  };

  const handleBulletAdd = async (sectionId) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.bullets.push('New bullet point');
    const updatedContent = reconstructContent(parsed);
    try {
      await api.patch(`/sections/${sectionId}`, { content: updatedContent });
      setProject(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      }));
    } catch (error) {
      console.error('Failed to add bullet', error);
    }
  };

  const handleImageEdit = async (sectionId, newImage) => {
    if (!project) return;
    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;
    const parsed = parseSlideContent(section.content);
    parsed.imageSuggestion = newImage;
    const updatedContent = reconstructContent(parsed);
    try {
      await api.patch(`/sections/${sectionId}`, { content: updatedContent });
      setProject(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, content: updatedContent } : s
        )
      }));
    } catch (error) {
      console.error('Failed to update image suggestion', error);
    }
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

  const handleGenerate = async (sectionId) => {
    setGeneratingSlides(prev => new Set(prev).add(sectionId));
    try {
      // Check if user has disliked this section and provided feedback
      const feedbackRes = await api.get(`/feedback/sections/${sectionId}`);

      if (feedbackRes.data.userFeedback === 'dislike') {
        // Get feedback comments
        const commentsRes = await api.get(`/feedback/sections/${sectionId}/comments`);

        if (commentsRes.data.length > 0) {
          // Regenerate with feedback
          const res = await api.post(`/feedback/sections/${sectionId}/regenerate`, {
            feedback: commentsRes.data[0].comment
          });
          setProject(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
              s.id === sectionId ? { ...s, content: res.data.content } : s
            )
          }));
        } else {
          // User disliked but didn't provide feedback, do regular generation
          const res = await api.post(`/generate/section/${sectionId}`);
          setProject(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
              s.id === sectionId ? { ...s, content: res.data.content } : s
            )
          }));
        }
      } else {
        // No dislike feedback, do regular generation
        const res = await api.post(`/generate/section/${sectionId}`);
        setProject(prev => ({
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId ? { ...s, content: res.data.content } : s
          )
        }));
      }
    } catch (error) {
      console.error('Generation failed', error);
    } finally {
      setGeneratingSlides(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/export/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project.title}.${project.type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  const scrollToSlide = (index) => {
    const slideElement = document.getElementById(`slide-${index}`);
    if (slideElement) {
      slideElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading || !project) {
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
              onClick={() => navigate('/')}
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
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 text-gray-700"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 text-white disabled:opacity-50"
            >
              {isExporting ? (
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
                  const parsed = parseSlideContent(section.content);
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
                const parsed = parseSlideContent(section.content);
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

                        {/* Feedback Section - key forces re-render when content changes */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <SectionFeedback
                            key={`feedback-${section.id}-${section.content?.substring(0, 50)}`}
                            sectionId={section.id}
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
        </div>
      </div>
    </>
  );
}