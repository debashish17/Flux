import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, Loader2, Sparkles, ArrowLeft, MessageSquare, Code, FileText, ArrowDown } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import DocumentPreview from '../components/DocumentPreview';
import { errorToast, successToast } from '../utils/toast';
import { useProject } from '../hooks/useProject';
import { useGenerateFullDocument, useGenerateSection, useRefineSection, useRegenerateWithFeedback } from '../hooks/useGeneration';
import { useAddSection, useDeleteSection, useReorderSection, useUpdateSection } from '../hooks/useSections';
import { useExportProject } from '../hooks/useExport';
import SectionReorder from '../components/SectionReorder';

export default function DocumentEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // React Query hooks for data fetching
    const { data: project, isLoading, error } = useProject(id);

    // Mutation hooks
    const generateFullDoc = useGenerateFullDocument();
    const generateSection = useGenerateSection();
    const refineSection = useRefineSection();
    const regenerateWithFeedback = useRegenerateWithFeedback();
    const addSection = useAddSection();
    const deleteSection = useDeleteSection();
    const reorderSection = useReorderSection();
    const updateSection = useUpdateSection();
    const exportProject = useExportProject();

    // UI state
    const [autoGenNotice, setAutoGenNotice] = useState("");
    const [chatOpen, setChatOpen] = useState(false);
    const [viewMode, setViewMode] = useState('preview');
    const [showReorder, setShowReorder] = useState(false);
    const [sectionFeedbackMap, setSectionFeedbackMap] = useState({}); // Track all section feedback

    // Auto-generate on mount if document is empty (DOCX only)
    useEffect(() => {
        if (project && project.sections && project.sections.length > 0) {
            const firstSection = project.sections[0];
            if (!firstSection.content || firstSection.content.trim() === '') {
                handleGenerateFullDocument();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]); // Only run when project ID changes

    const handleGenerateFullDocument = async () => {
        if (!project || !project.sections) {
            console.error('No project data available');
            return;
        }
        try {
            const firstSection = project.sections[0];
            const isInitialGeneration = !firstSection.content || firstSection.content.trim() === '';

            if (isInitialGeneration) {
                setAutoGenNotice("AI is generating your document... This may take up to 2 minutes for large documents.");
                await generateFullDoc.mutateAsync({ projectId: parseInt(id) });
                setAutoGenNotice("Document generated successfully!");
                setTimeout(() => setAutoGenNotice(""), 3000);
                return;
            }

            // Regeneration mode - check for disliked sections with feedback from local state
            const dislikedSections = [];
            for (const section of project.sections) {
                const feedback = sectionFeedbackMap[section.id];

                if (feedback?.type === 'DISLIKE' && feedback?.comment && feedback.comment.trim()) {
                    dislikedSections.push({
                        id: section.id,
                        title: section.title,
                        feedback: feedback.comment
                    });
                    console.log(`✓ Section ${section.id} added for regeneration with feedback: "${feedback.comment}"`);
                }
            }

            console.log(`Total sections to regenerate: ${dislikedSections.length}`);

            if (dislikedSections.length === 0) {
                setAutoGenNotice("No sections marked for regeneration. Please dislike and add feedback to sections you want to improve.");
                setTimeout(() => setAutoGenNotice(""), 4000);
                return;
            }

            setAutoGenNotice(`Regenerating ${dislikedSections.length} section${dislikedSections.length > 1 ? 's' : ''} based on your feedback...`);

            // Regenerate all disliked sections in parallel
            const results = await Promise.allSettled(
                dislikedSections.map(section =>
                    regenerateWithFeedback.mutateAsync({
                        sectionId: section.id,
                        feedback: section.feedback,
                        projectId: parseInt(id)
                    })
                )
            );

            // Count successes and failures
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            // Show success/failure message
            if (successful.length > 0) {
                const message = failed.length > 0
                    ? `Regenerated ${successful.length} section${successful.length > 1 ? 's' : ''}. ${failed.length} failed.`
                    : `Successfully regenerated ${successful.length} section${successful.length > 1 ? 's' : ''}!`;
                setAutoGenNotice(message);
                setTimeout(() => setAutoGenNotice(""), 4000);

                // Clear ALL feedback after successful regeneration (reset to neutral)
                setSectionFeedbackMap({});
            } else {
                setAutoGenNotice("Failed to regenerate sections. Please try again.");
                setTimeout(() => setAutoGenNotice(""), 5000);
            }
        } catch (error) {
            console.error('Failed to regenerate sections', error);
            if (error.code === 'ECONNABORTED') {
                setAutoGenNotice("Request timed out. The AI is taking longer than expected. Please try with fewer sections or simpler content.");
            } else {
                setAutoGenNotice("Failed to regenerate. Please try again.");
            }
            setTimeout(() => setAutoGenNotice(""), 8000);
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
                    successToast('Document exported successfully!');
                },
                onError: (error) => {
                    const errorMessage = error.response?.data?.detail || error.message || 'Failed to export document';
                    errorToast(`Export failed: ${errorMessage}`);
                }
            }
        );
    };

    const handleAddSection = async (afterSectionId) => {
        try {
            await addSection.mutateAsync({
                projectId: parseInt(id),
                title: 'New Section',
                content: '',
                insertAfter: afterSectionId
            });
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
            await deleteSection.mutateAsync({ sectionId, projectId: parseInt(id) });
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

        // Validate bounds
        if (newIndex < 0 || newIndex >= project.sections.length) {
            return;
        }

        try {
            await reorderSection.mutateAsync({
                sectionId,
                newOrderIndex: newIndex,
                projectId: parseInt(id)
            });
        } catch (error) {
            console.error('Failed to reorder section', error);
            setAutoGenNotice("Failed to reorder section.");
            setTimeout(() => setAutoGenNotice(""), 3000);
        }
    };

    const handlePreviewSectionUpdate = async (sectionId, newContent) => {
        try {
            await updateSection.mutateAsync({
                sectionId,
                updates: { content: newContent },
                projectId: parseInt(id)
            });
            setAutoGenNotice("Content saved successfully!");
            setTimeout(() => setAutoGenNotice(""), 2000);
        } catch (error) {
            console.error('Failed to save content', error);
            setAutoGenNotice("Failed to save content.");
            setTimeout(() => setAutoGenNotice(""), 3000);
            throw error;
        }
    };

    // Section reorder handler
    const handleReorderSections = async (sectionId, newOrderIndex) => {
        try {
            await reorderSection.mutateAsync({
                sectionId,
                newOrderIndex,
                projectId: parseInt(id),
            });
            setShowReorder(false);
            setAutoGenNotice('Sections reordered!');
            setTimeout(() => setAutoGenNotice(''), 2000);
        } catch (error) {
            setAutoGenNotice('Failed to reorder sections.');
            setTimeout(() => setAutoGenNotice(''), 3000);
        }
    };

    // Loading state
    if (isLoading) {
        return null;
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load project</h2>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // No project found
    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }


    // Check if document has content
    const hasContent = project?.sections?.length > 0 &&
                      project.sections.some(s => s.content && s.content.trim() !== '');

    // Count sections with feedback
    const sectionsWithFeedback = Object.values(sectionFeedbackMap).filter(
        feedback => feedback?.type === 'DISLIKE' && feedback?.comment?.trim()
    ).length;

    // Check if any mutation is loading (DOCX only)
    const isGenerating = generateFullDoc.isPending ||
                        generateSection.isPending ||
                        refineSection.isPending ||
                        regenerateWithFeedback.isPending ||
                        project?._generating;

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
                                        onClick={() => navigate('/dashboard')}
                                        className="shrink-0 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                        title="Back to Dashboard"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                        <h1 className="font-semibold text-lg text-gray-900 truncate">
                                            {project?.title}
                                        </h1>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">
                                            Word Document
                                        </p>
                                    </div>
                                </div>

                                {/* Right Section */}
                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Reorder Sections Button */}
                                    <button
                                        onClick={() => setShowReorder(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                        <span className="hidden sm:inline">Reorder Sections</span>
                                    </button>
                                    {/* View Mode Toggle - Preview/Markdown (DOCX Only) */}
                                    {hasContent && (
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

                                    {/* Regenerate Button (DOCX Only) */}
                                    {hasContent && (
                                        <>
                                            <div className="hidden lg:block w-px h-8 bg-gray-200" />
                                            <button
                                                onClick={handleGenerateFullDocument}
                                                disabled={isGenerating}
                                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all disabled:opacity-50 relative ${
                                                    sectionsWithFeedback > 0
                                                        ? 'border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100'
                                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="hidden sm:inline">Regenerating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        <span className="hidden sm:inline">
                                                            Regenerate
                                                            {sectionsWithFeedback > 0 && ` (${sectionsWithFeedback})`}
                                                        </span>
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
                                        disabled={exportProject.isPending}
                                        className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {exportProject.isPending ? (
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

                    {/* Document Content - DOCX Only */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading || !project ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                                <p className="text-gray-600">Loading document...</p>
                            </div>
                        ) : isGenerating && !hasContent ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                                <p className="text-gray-600">Generating your document...</p>
                            </div>
                        ) : (
                            <DocumentPreview
                                sections={project?.sections || []}
                                viewMode={viewMode}
                                projectTitle={project?.title || ''}
                                projectId={parseInt(id)}
                                onSectionUpdate={handlePreviewSectionUpdate}
                                onSectionRefresh={(sectionId) => {
                                    // Refetch project to get updated section after restore
                                    queryClient.invalidateQueries(['projects', parseInt(id)]);
                                }}
                                onFeedbackMapChange={setSectionFeedbackMap}
                            />
                        )}
                    </div>
                </div>

                {/* Chat Sidebar */}
                <ChatSidebar projectId={parseInt(id)} isOpen={chatOpen} onClose={() => setChatOpen(false)} />

                {/* Section Reorder Sidebar */}
                {showReorder && (
                    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-slide-in">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-bold">Reorder Sections</h2>
                            <button className="text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowReorder(false)}>&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <SectionReorder
                                sections={project?.sections || []}
                                onReorder={handleReorderSections}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
