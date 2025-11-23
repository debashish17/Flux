import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Download, Send, RefreshCw, Loader2, Sparkles, ArrowLeft, MessageSquare, FileText, Code } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import DocumentPreview from '../components/DocumentPreview';
import LatexPreview from '../components/LatexPreview'; // Keep for legacy projects

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

    useEffect(() => {
        loadProject();
    }, [id]);

    const loadProject = async () => {
        try {
            const res = await api.get(`/projects/${id}`);
            console.log('Loaded project:', res.data);
            console.log('First section content:', res.data.sections[0]?.content?.substring(0, 200));
            setProject(res.data);

            // Auto-generate full document for DOCX if empty
            if (res.data.type === 'docx' && res.data.sections.length > 0) {
                const firstSection = res.data.sections[0];
                if (!firstSection.content || firstSection.content.trim() === '') {
                    generateFullDocument();
                }
            }
        } catch (error) {
            console.error('Failed to load project', error);
        }
    };

    const generateFullDocument = async () => {
        setAutoGenerating(true);
        setAutoGenNotice("AI is generating the full document...");

        try {
            await api.post(`/projects/${id}/generate-full-document`);
            // Add a short delay to ensure backend has committed changes
            await new Promise(resolve => setTimeout(resolve, 500));
            const projectRes = await api.get(`/projects/${id}`);
            console.log('Generated project:', projectRes.data);
            console.log('Generated content preview:', projectRes.data.sections[0]?.content?.substring(0, 200));
            console.log('Has \\documentclass?', projectRes.data.sections[0]?.content?.includes('\\documentclass'));
            setProject(projectRes.data);
            setAutoGenNotice("Document generated successfully!");
            setTimeout(() => setAutoGenNotice(""), 3000);
        } catch (error) {
            console.error('Failed to generate full document', error);
            setAutoGenNotice("Failed to generate document. Please try again.");
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
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            setIsExporting(false);
        }
    };

    if (!project) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    // Check if it's a LaTeX document (legacy format)
    const isLatexDocument = project.type === 'docx' &&
                           project.sections.length > 0 &&
                           project.sections[0].content &&
                           (project.sections[0].content.includes('\\documentclass') ||
                            project.sections[0].content.includes('\\begin{document}'));

    // Check if it's a Markdown document (new format - has htmlContent or markdown-style content)
    const isMarkdownDocument = project.type === 'docx' &&
                               project.sections.length > 0 &&
                               project.sections[0].content &&
                               !isLatexDocument &&
                               (project.sections[0].htmlContent ||
                                project.sections[0].content.includes('##'));

    const hasContent = project.sections.length > 0 &&
                      project.sections.some(s => s.content && s.content.trim() !== '');

    console.log('isLatexDocument:', isLatexDocument);
    console.log('isMarkdownDocument:', isMarkdownDocument);
    console.log('Project type:', project.type);
    console.log('Sections count:', project.sections.length);
    console.log('Has content:', hasContent);

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
                    {/* Header - Improved Structure */}
                    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                        <div className="mx-auto px-6 py-3">
                            <div className="flex items-center justify-between gap-6">
                                {/* Left Section: Back Button + Project Info */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                        title="Back to Dashboard"
                                        aria-label="Back to Dashboard"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="min-w-0 flex-1">
                                        <h1 className="font-semibold text-lg text-gray-900 truncate">
                                            {project.title}
                                        </h1>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">
                                            {project.type === 'docx' ? 'Word Document' : 'PowerPoint Presentation'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Section: Actions */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {/* View Mode Toggle for document view */}
                                    {(isLatexDocument || isMarkdownDocument) && (
                                        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                                            <button
                                                onClick={() => setViewMode('preview')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                                    viewMode === 'preview'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                                aria-label="Preview mode"
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
                                                aria-label="Code view mode"
                                            >
                                                <Code className="w-4 h-4" />
                                                <span className="hidden sm:inline">{isLatexDocument ? 'LaTeX' : 'Markdown'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Regenerate Button for documents */}
                                    {(isLatexDocument || isMarkdownDocument) && (
                                        <>
                                            <div className="hidden lg:block w-px h-8 bg-gray-200" />
                                            <button
                                                onClick={generateFullDocument}
                                                disabled={autoGenerating}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Regenerate document"
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

                                    {/* Divider */}
                                    <div className="hidden lg:block w-px h-8 bg-gray-200" />

                                    {/* Chat Button */}
                                    <button
                                        onClick={() => setChatOpen(!chatOpen)}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                                            chatOpen
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                        aria-label="Toggle chat"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="hidden sm:inline">Chat</span>
                                    </button>

                                    {/* Export Button */}
                                    <button
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Export document"
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
                        {/* For DOCX: Show preview based on format */}
                        {project.type === 'docx' ? (
                            isMarkdownDocument ? (
                                <DocumentPreview
                                    sections={project.sections}
                                    viewMode={viewMode}
                                    projectTitle={project.title}
                                />
                            ) : isLatexDocument ? (
                                <LatexPreview
                                    latexContent={project.sections[0].content}
                                    viewMode={viewMode}
                                />
                            ) : hasContent ? (
                                <DocumentPreview
                                    sections={project.sections}
                                    viewMode={viewMode}
                                    projectTitle={project.title}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                                    <p className="text-gray-600">Generating your document...</p>
                                </div>
                            )
                        ) : (
                            <div className="max-w-4xl mx-auto py-8 px-4">
                                <div className="bg-white rounded-lg shadow-lg p-12">
                                    {/* Document Title */}
                                    <div className="text-center pb-6 border-b-2 border-gray-200 mb-8">
                                        <h1 className="text-4xl font-bold text-gray-900">{project.title}</h1>
                                    </div>

                                    {/* For PPTX: Show section-by-section */}
                                    <div className="space-y-12">
                                        {project.sections.map((section, index) => (
                                            <div key={section.id} className="space-y-4">
                                                {/* Section Header */}
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

                                                {/* Section Content */}
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

                                                {/* Refinement Input */}
                                                {section.content && (
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
                                                )}

                                                {/* Section Divider */}
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