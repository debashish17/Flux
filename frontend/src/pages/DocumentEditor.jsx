import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Download, RefreshCw, Loader2, Sparkles, ArrowLeft, MessageSquare, Code, FileText, Send } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import DocumentPreview from '../components/DocumentPreview';
import SectionFeedback from '../components/SectionFeedback';
import { errorToast, successToast } from '../utils/toast';


export default function DocumentEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [refinementPrompts, setRefinementPrompts] = useState({});
    const [loadingSection, setLoadingSection] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [autoGenerating, setAutoGenerating] = useState(false);
    const [autoGenNotice, setAutoGenNotice] = useState("");
    const [chatOpen, setChatOpen] = useState(false);
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
    const [refreshKey, setRefreshKey] = useState(0); // Force refresh of feedback components
    const [feedbackCache, setFeedbackCache] = useState({}); // Cache feedback for all sections

    useEffect(() => {
        loadProject();
    }, [id]);

    const loadProject = async () => {
        try {
            const res = await api.get(`/projects/${id}`);
            console.log('Loaded project:', res.data);
            console.log('First section content:', res.data.sections[0]?.content?.substring(0, 200));
            setProject(res.data);

            // Load feedback in batch (single API call instead of N calls)
            try {
                const feedbackRes = await api.get(`/feedback/projects/${id}/batch`);
                setFeedbackCache(feedbackRes.data);
            } catch (error) {
                console.error('Failed to load feedback batch:', error);
            }

            // Auto-generate full document for DOCX if empty
            if (res.data.type === 'docx' && res.data.sections.length > 0) {
                const firstSection = res.data.sections[0];
                if (!firstSection.content || firstSection.content.trim() === '') {
                    generateFullDocument(res.data);
                }
            }
        } catch (error) {
            console.error('Failed to load project', error);
        }
    };

    const generateFullDocument = async (projectData = null) => {
        // Use provided projectData or fall back to state
        const currentProject = projectData || project;

        // Safety check
        if (!currentProject || !currentProject.sections) {
            console.error('No project data available');
            return;
        }

        try {
            setAutoGenerating(true);

            // Check if this is initial generation (empty content) or regeneration (disliked sections)
            const firstSection = currentProject.sections[0];
            const isInitialGeneration = !firstSection.content || firstSection.content.trim() === '';

            if (isInitialGeneration) {
                // Initial generation - use the full document generation endpoint
                setAutoGenNotice("AI is generating your document...");
                try {
                    await api.post(`/projects/${currentProject.id}/generate-full-document`);

                    // Invalidate dashboard cache so updated timestamp is visible
                    sessionStorage.removeItem('dashboard_projects');
                    sessionStorage.removeItem('dashboard_cache_timestamp');

                    // Reload project
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const projectRes = await api.get(`/projects/${id}`);
                    setProject(projectRes.data);
                    setRefreshKey(prev => prev + 1);

                    setAutoGenNotice("Document generated successfully!");
                    setTimeout(() => setAutoGenNotice(""), 3000);
                } catch (error) {
                    console.error('Failed to generate document', error);
                    setAutoGenNotice("Failed to generate document. Please try again.");
                    setTimeout(() => setAutoGenNotice(""), 5000);
                }
                setAutoGenerating(false);
                return;
            }

            // Regeneration mode - check for disliked sections with feedback
            const dislikedSections = [];
            for (const section of currentProject.sections) {
                try {
                    const feedbackRes = await api.get(`/feedback/sections/${section.id}`);
                    if (feedbackRes.data.userFeedback === 'dislike') {
                        // Get the feedback comment
                        const commentsRes = await api.get(`/feedback/sections/${section.id}/comments`);
                        if (commentsRes.data.length > 0) {
                            dislikedSections.push({
                                id: section.id,
                                title: section.title,
                                feedback: commentsRes.data[0].comment
                            });
                        }
                    }
                } catch (err) {
                    console.log(`No feedback for section ${section.id}`);
                }
            }

            if (dislikedSections.length === 0) {
                setAutoGenNotice("No sections marked for regeneration. Please dislike and add feedback to sections you want to improve.");
                setTimeout(() => setAutoGenNotice(""), 4000);
                setAutoGenerating(false);
                return;
            }

            setAutoGenNotice(`Regenerating ${dislikedSections.length} section${dislikedSections.length > 1 ? 's' : ''} based on your feedback...`);

            // Regenerate each disliked section
            for (const section of dislikedSections) {
                try {
                    await api.post(`/feedback/sections/${section.id}/regenerate`, {
                        feedback: section.feedback
                    });
                } catch (error) {
                    console.error(`Failed to regenerate section ${section.id}`, error);
                }
            }

            // Reload the project
            await new Promise(resolve => setTimeout(resolve, 500));
            const projectRes = await api.get(`/projects/${id}`);
            setProject(projectRes.data);

            // Update feedback cache - reset disliked sections to null
            const updatedCache = { ...feedbackCache };
            dislikedSections.forEach(section => {
                updatedCache[section.id] = { userFeedback: null };
            });
            setFeedbackCache(updatedCache);

            // Force refresh of all feedback components
            setRefreshKey(prev => prev + 1);

            setAutoGenNotice(`Successfully regenerated ${dislikedSections.length} section${dislikedSections.length > 1 ? 's' : ''}!`);
            setTimeout(() => setAutoGenNotice(""), 3000);
        } catch (error) {
            console.error('Failed to regenerate sections', error);
            setAutoGenNotice("Failed to regenerate. Please try again.");
            setTimeout(() => setAutoGenNotice(""), 5000);
        } finally {
            setAutoGenerating(false);
        }
    };

    const handleGenerate = async (sectionId) => {
        setLoadingSection(sectionId);
        try {
            const res = await api.post(`/generate/section/${sectionId}`);
            const updatedSections = project.sections.map(s =>
                s.id === sectionId ? { ...s, content: res.data.content } : s
            );
            setProject({ ...project, sections: updatedSections });

            // Invalidate dashboard cache
            sessionStorage.removeItem('dashboard_projects');
            sessionStorage.removeItem('dashboard_cache_timestamp');
        } catch (error) {
            console.error('Generation failed', error);
        } finally {
            setLoadingSection(null);
        }
    };

    const handleRefine = async (sectionId) => {
        const instruction = refinementPrompts[sectionId];
        if (!instruction) return;

        setLoadingSection(sectionId);
        try {
            const res = await api.post(`/generate/refine/${sectionId}`, {
                instruction: instruction
            });

            const updatedSections = project.sections.map(s =>
                s.id === sectionId ? { ...s, content: res.data.content } : s
            );
            setProject({ ...project, sections: updatedSections });
            setRefinementPrompts({ ...refinementPrompts, [sectionId]: '' });

            // Invalidate dashboard cache
            sessionStorage.removeItem('dashboard_projects');
            sessionStorage.removeItem('dashboard_cache_timestamp');
        } catch (error) {
            console.error('Refinement failed', error);
        } finally {
            setLoadingSection(null);
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
            successToast('Document exported successfully!');
        } catch (error) {
            console.error('Export failed', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to export document';
            errorToast(`Export failed: ${errorMessage}`);
        } finally {
            setIsExporting(false);
        }
    };


    const handleAddSection = async (afterSectionId) => {
        try {
            const newSection = await api.post('/sections/', {
                projectId: parseInt(id),
                title: 'New Section',
                content: '',
                insertAfter: afterSectionId
            });

            await loadProject();
            setAutoGenNotice("Section added successfully!");
            setTimeout(() => setAutoGenNotice(""), 2000);
        } catch (error) {
            console.error('Failed to add section', error);
            setAutoGenNotice("Failed to add section.");
            setTimeout(() => setAutoGenNotice(""), 3000);
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (!confirm('Are you sure you want to delete this section?')) return;

        try {
            await api.delete(`/sections/${sectionId}`);
            await loadProject();
            setAutoGenNotice("Section deleted successfully!");
            setTimeout(() => setAutoGenNotice(""), 2000);
        } catch (error) {
            console.error('Failed to delete section', error);
            setAutoGenNotice("Failed to delete section.");
            setTimeout(() => setAutoGenNotice(""), 3000);
        }
    };

    const handleMoveSection = async (sectionId, currentIndex, direction) => {
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        try {
            await api.patch(`/sections/${sectionId}/reorder`, {
                newOrderIndex: newIndex
            });
            await loadProject();
        } catch (error) {
            console.error('Failed to reorder section', error);
            setAutoGenNotice("Failed to reorder section.");
            setTimeout(() => setAutoGenNotice(""), 3000);
        }
    };

    // Handler for inline editing in DocumentPreview
    const handlePreviewSectionUpdate = async (sectionId, newContent) => {
        try {
            // Update content via API
            await api.patch(`/sections/${sectionId}`, { content: newContent });

            // Reload project to get updated htmlContent from backend
            await loadProject();

            setAutoGenNotice("Content saved successfully!");
            setTimeout(() => setAutoGenNotice(""), 2000);
        } catch (error) {
            console.error('Failed to save content', error);
            setAutoGenNotice("Failed to save content.");
            setTimeout(() => setAutoGenNotice(""), 3000);
            throw error; // Re-throw so DocumentPreview can handle it
        }
    };


    if (!project) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    // Check if document has content
    const hasContent = project.sections.length > 0 &&
                      project.sections.some(s => s.content && s.content.trim() !== '');

    return (
        <>
            {autoGenNotice && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg shadow-md z-50 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">{autoGenNotice}</span>
                </div>
            )}

            <div className="flex h-screen bg-gray-100 overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                        <div className="mx-auto px-6 py-3">
                            <div className="flex items-center justify-between gap-6">
                                {/* Left Section */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                        title="Back to Dashboard"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                        <h1 className="font-semibold text-lg text-gray-900 truncate">
                                            {project?.title}
                                        </h1>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">
                                            {project?.type === 'docx' ? 'Word Document' : 'PowerPoint Presentation'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Section */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {/* View Mode Toggle - Preview/Markdown */}
                                    {project?.type === 'docx' && hasContent && (
                                        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                                            <button
                                                onClick={() => setViewMode('preview')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                                    viewMode === 'preview'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span className="hidden sm:inline">Preview</span>
                                            </button>
                                            <button
                                                onClick={() => setViewMode('code')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                                    viewMode === 'code'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Code className="w-4 h-4" />
                                                <span className="hidden sm:inline">Markdown</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Regenerate Button */}
                                    {project?.type === 'docx' && hasContent && (
                                        <>
                                            <div className="hidden lg:block w-px h-8 bg-gray-200" />
                                            <button
                                                onClick={() => generateFullDocument()}
                                                disabled={autoGenerating}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
                                            >
                                                {autoGenerating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="hidden sm:inline">Regenerating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Regenerate</span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}

                                    <div className="hidden lg:block w-px h-8 bg-gray-200" />

                                    {/* Chat Button */}
                                    <button
                                        onClick={() => setChatOpen(!chatOpen)}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                                            chatOpen
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="hidden sm:inline">Chat</span>
                                    </button>

                                    {/* Export Button */}
                                    <button
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="hidden sm:inline">Exporting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                <span className="hidden sm:inline">Export</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Document Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* For DOCX: Show preview with inline editing */}
                        {project?.type === 'docx' ? (
                            hasContent ? (
                                <DocumentPreview
                                    key={refreshKey}
                                    sections={project.sections}
                                    viewMode={viewMode}
                                    projectTitle={project.title}
                                    feedbackCache={feedbackCache}
                                    onSectionUpdate={handlePreviewSectionUpdate}
                                    onSectionRefresh={(updatedSection) => {
                                        // Update the section in the project state
                                        setProject(prev => ({
                                            ...prev,
                                            sections: prev.sections.map(s =>
                                                s.id === updatedSection.id ? updatedSection : s
                                            )
                                        }));
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                                    <p className="text-gray-600">Generating your document...</p>
                                </div>
                            )
                        ) : (
                            // ...existing code for pptx...
                            <div className="max-w-4xl mx-auto py-8 px-4">
                                <div className="bg-white rounded-lg shadow-lg p-12">
                                    <div className="text-center pb-6 border-b-2 border-gray-200 mb-8">
                                        <h1 className="text-4xl font-bold text-gray-900">{project.title}</h1>
                                    </div>

                                    <div className="space-y-12">
                                        {project.sections.map((section, index) => (
                                            <div key={section.id} className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                                        Slide {index + 1}: {section.title}
                                                    </h2>
                                                    <button
                                                        onClick={() => handleGenerate(section.id)}
                                                        disabled={loadingSection === section.id}
                                                        className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        {loadingSection === section.id ? (
                                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                                        ) : (
                                                            <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="prose max-w-none">
                                                    {loadingSection === section.id && !section.content ? (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
                                                            <p className="text-gray-500">Generating content...</p>
                                                        </div>
                                                    ) : section.content ? (
                                                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                            {section.content}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                                                            <p className="text-gray-400 italic mb-4">
                                                                No content generated yet.
                                                            </p>
                                                            <button
                                                                onClick={() => handleGenerate(section.id)}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                                            >
                                                                <Sparkles className="w-4 h-4 mr-2" />
                                                                Generate Content
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {section.content && (
                                                    <>
                                                        <div className="pt-4">
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    handleRefine(section.id);
                                                                }}
                                                                className="flex gap-2"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={refinementPrompts[section.id] || ''}
                                                                    onChange={(e) => setRefinementPrompts({
                                                                        ...refinementPrompts,
                                                                        [section.id]: e.target.value
                                                                    })}
                                                                    placeholder="Refine this section (e.g., 'Make it more formal', 'Add examples')..."
                                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm"
                                                                    disabled={loadingSection === section.id}
                                                                />
                                                                <button
                                                                    type="submit"
                                                                    disabled={loadingSection === section.id || !refinementPrompts[section.id]}
                                                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                </button>
                                                            </form>
                                                        </div>

                                                        {/* Feedback Section */}
                                                        <div className="pt-4 mt-4 border-t border-gray-200">
                                                            <SectionFeedback
                                                                sectionId={section.id}
                                                                onRegenerateSuccess={(updatedSection) => {
                                                                    // Update the section in the project state
                                                                    setProject(prev => ({
                                                                        ...prev,
                                                                        sections: prev.sections.map(s =>
                                                                            s.id === updatedSection.id ? updatedSection : s
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {index < project.sections.length - 1 && (
                                                    <div className="pt-8">
                                                        <hr className="border-gray-200" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Sidebar */}
                <ChatSidebar projectId={parseInt(id)} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
            </div>

        </>
    );
}