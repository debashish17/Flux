

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Trash2, Sparkles, Wand2, Loader2, FileText, Presentation } from 'lucide-react';

export default function ProjectSetup() {
    const [userPrompt, setUserPrompt] = useState('');
    const [title, setTitle] = useState('');
    const [type, setType] = useState('docx');
    const [sections, setSections] = useState([]);
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPlanning, setIsPlanning] = useState(false);
    const [structureGenerated, setStructureGenerated] = useState(false);
    const [aiError, setAiError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const navigate = useNavigate();

    const handleGenerateStructure = async () => {
        if (!userPrompt.trim()) {
            return;
        }

        setIsPlanning(true);
        setAiError("");
        try {
            console.log('Sending request to /projects/plan with:', { prompt: userPrompt, type });
            const response = await api.post('/projects/plan', {
                prompt: userPrompt,
                type: type
            });

            console.log('Received response:', response.data);

            if (response.data.error) {
                setAiError(response.data.error);
                setIsPlanning(false);
                return;
            }

            setTitle(response.data.title);
            setSections(response.data.sections);
            setStructureGenerated(true);
        } catch (error) {
            console.error('Failed to generate structure:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            const errorMessage = error.response?.data?.detail
                || error.response?.data?.error
                || error.message
                || "Failed to generate structure. Please make sure the backend server is running.";
            setAiError(errorMessage);
        } finally {
            setIsPlanning(false);
        }
    };

    const handleAddSection = () => {
        setSections([...sections, 'New Section']);
    };

    const handleRemoveSection = (index) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const handleSectionChange = (index, value) => {
        const newSections = [...sections];
        newSections[index] = value;
        setSections(newSections);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError("");
        try {
            // Create the project
            const response = await api.post('/projects/', {
                title,
                type,
                initial_sections: sections,
                auto_generate: autoGenerate,
                prompt: userPrompt
            });

            // Navigate to the editor
            navigate(`/editor/${response.data.id}`);
        } catch (error) {
            console.error('Failed to create project', error);
            setSubmitError(error.response?.data?.detail || "Failed to create project. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-semibold text-gray-900">New Project</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                {!structureGenerated ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8">
                        {aiError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                                <strong>AI Error:</strong> {aiError}
                            </div>
                        )}
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create with AI</h2>
                            <p className="text-gray-600">Describe what you want to create, and AI will generate the structure</p>
                        </div>

                        <div className="space-y-6">
                            {/* Document Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Document Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setType('docx')}
                                        className={`p-6 border rounded-xl transition-all ${type === 'docx'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <FileText className={`w-8 h-8 mx-auto mb-3 ${type === 'docx' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <p className="font-medium text-gray-900">Word Document</p>
                                        <p className="text-xs text-gray-500 mt-1">Professional documents & reports</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('pptx')}
                                        className={`p-6 border rounded-xl transition-all ${type === 'pptx'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Presentation className={`w-8 h-8 mx-auto mb-3 ${type === 'pptx' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <p className="font-medium text-gray-900">Presentation</p>
                                        <p className="text-xs text-gray-500 mt-1">Slides & pitch decks</p>
                                    </button>
                                </div>
                            </div>

                            {/* Prompt Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Describe your {type === 'docx' ? 'document' : 'presentation'}
                                </label>
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder={type === 'docx'
                                        ? "e.g., Create a business plan for a tech startup focused on AI-powered marketing tools. Include market analysis, financial projections, and implementation timeline."
                                        : "e.g., Create a pitch deck for a sustainable fashion startup targeting millennials. Include problem statement, solution, market opportunity, business model, and team."}
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    💡 Tip: Be specific about the topic, target audience, and key points you want to cover
                                </p>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerateStructure}
                                disabled={isPlanning || !userPrompt.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {isPlanning ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Generating Structure...</>
                                ) : (
                                    <><Wand2 className="w-5 h-5" /> Generate Structure with AI</>
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    onClick={() => {
                                        setTitle(type === 'docx' ? 'Untitled Document' : 'Untitled Presentation');
                                        setSections(type === 'docx' ? ['Introduction', 'Main Body', 'Conclusion'] : ['Introduction', 'Main Content', 'Conclusion']);
                                        setStructureGenerated(true);
                                    }}
                                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Or create manually
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900">Review & Edit Structure</h2>
                            <button
                                onClick={() => { setStructureGenerated(false); setSections([]); setTitle(''); setSubmitError(''); }}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                ← Start Over
                            </button>
                        </div>

                        {submitError && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                                <strong>Error:</strong> {submitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {type === 'docx' ? 'Sections' : 'Slides'} ({sections.length})
                                </label>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {sections.map((section, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <span className="text-sm text-gray-500 font-medium min-w-[30px]">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={section}
                                                onChange={(e) => handleSectionChange(index, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSection(index)}
                                                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddSection}
                                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add {type === 'docx' ? 'Section' : 'Slide'}
                                </button>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoGenerate}
                                        onChange={(e) => setAutoGenerate(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded"
                                        style={{ accentColor: '#2563eb' }}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                            <Sparkles className="w-4 h-4 text-blue-600" />
                                            Auto-generate content with AI
                                        </div>
                                        <p className="mt-1 text-xs text-gray-600">
                                            AI will automatically create content for all {type === 'docx' ? 'sections' : 'slides'} based on your original prompt
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                                ) : (
                                    <>Create {type === 'docx' ? 'Document' : 'Presentation'}</>
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
