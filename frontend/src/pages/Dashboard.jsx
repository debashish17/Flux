import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { FileText, Plus, Presentation, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, projectId: null, projectTitle: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = () => {
        api.get('/projects/')
            .then(res => setProjects(res.data))
            .catch(err => {
                console.error(err);
                setError('Failed to load projects');
            });
    };

    const openDeleteModal = (e, projectId, projectTitle) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModal({ isOpen: true, projectId, projectTitle });
        setError('');
    };

    const closeDeleteModal = () => {
        if (!isDeleting) {
            setDeleteModal({ isOpen: false, projectId: null, projectTitle: '' });
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        setError('');

        try {
            await api.delete(`/projects/${deleteModal.projectId}`);

            // Update UI only after successful deletion
            setProjects(projects.filter(p => p.id !== deleteModal.projectId));
            closeDeleteModal();
        } catch (error) {
            console.error('Failed to delete project', error);
            setError(error.response?.data?.detail || 'Failed to delete project. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Simple header */}
            <header className="border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">My Projects</h1>
                    <Link
                        to="/create"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </Link>
                </div>
            </header>

            {/* Error message */}
            {error && (
                <div className="max-w-7xl mx-auto px-6 pt-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                </div>
            )}

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="text-center max-w-md">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
                            <p className="text-gray-600 mb-6">Get started by creating your first project</p>
                            <Link
                                to="/create"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Project
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                to={`/editor/${project.id}`}
                                className="group relative block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                        {project.type === 'docx' ? (
                                            <FileText className="w-5 h-5 text-gray-600" />
                                        ) : (
                                            <Presentation className="w-5 h-5 text-gray-600" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-medium text-gray-900 mb-1 truncate">
                                            {project.title}
                                        </h3>
                                        <span className="inline-block text-xs text-gray-500 uppercase">
                                            {project.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => openDeleteModal(e, project.id, project.title)}
                                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete project"
                                >
                                    <Trash2 className="w-4 h-4 text-gray-500" />
                                </button>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
                projectTitle={deleteModal.projectTitle}
                isDeleting={isDeleting}
            />
        </div>
    );
}