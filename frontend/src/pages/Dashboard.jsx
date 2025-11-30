import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { FileText, Plus, Presentation, Trash2, Search, SlidersHorizontal, LogOut } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, projectId: null, projectTitle: '' });
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // recent, name-asc, name-desc, type
    const [filterType, setFilterType] = useState('all'); // all, docx, pptx
    const [showFilters, setShowFilters] = useState(false);

    // Fetch projects with React Query
    const { data: projects = [], isLoading: loading, isError } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.get('/projects/?limit=1000');
            return response.data;
        },
    });

    // Delete mutation with automatic cache invalidation
    const deleteMutation = useMutation({
        mutationFn: (projectId) => api.delete(`/projects/${projectId}`),
        onSuccess: () => {
            // Invalidate and refetch projects
            queryClient.invalidateQueries(['projects']);
            setDeleteModal({ isOpen: false, projectId: null, projectTitle: '' });
            setError('');
        },
        onError: (error) => {
            console.error('Failed to delete project', error);
            setError('Failed to delete project. Please try again.');
        },
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        queryClient.clear(); // Clear all React Query cache
        window.location.href = '/login'; // Force full reload to update auth state
    };

    const openDeleteModal = (e, projectId, projectTitle) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModal({ isOpen: true, projectId, projectTitle });
        setError('');
    };

    const closeDeleteModal = () => {
        if (!deleteMutation.isPending) {
            setDeleteModal({ isOpen: false, projectId: null, projectTitle: '' });
        }
    };

    const handleDelete = async () => {
        setError('');
        deleteMutation.mutate(deleteModal.projectId);
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const docxCount = projects.filter(p => p.type === 'docx').length;
        const pptxCount = projects.filter(p => p.type === 'pptx').length;
        return {
            total: projects.length,
            docx: docxCount,
            pptx: pptxCount
        };
    }, [projects]);

    // Filter and sort projects
    const filteredAndSortedProjects = useMemo(() => {
        let filtered = [...projects];

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.type === filterType);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                case 'name-asc':
                    return a.title.localeCompare(b.title);
                case 'name-desc':
                    return b.title.localeCompare(a.title);
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [projects, searchQuery, filterType, sortBy]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">My Projects</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                        <Link
                            to="/create"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </Link>
                    </div>
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
                {loading ? (
                    <>
                        {/* Loading skeletons for stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>

                        {/* Loading skeletons for projects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : projects.length === 0 ? (
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
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Documents</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.docx}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Presentations</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.pptx}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                                        <Presentation className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search projects..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {/* Filter Toggle */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Filters
                                </button>
                            </div>

                            {/* Filter Options */}
                            {showFilters && (
                                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Type Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="docx">Documents</option>
                                            <option value="pptx">Presentations</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="recent">Most Recent</option>
                                            <option value="name-asc">Name (A-Z)</option>
                                            <option value="name-desc">Name (Z-A)</option>
                                            <option value="type">Type</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results Count */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                Showing {filteredAndSortedProjects.length} of {projects.length} projects
                            </p>
                        </div>

                        {/* Projects Grid */}
                        {filteredAndSortedProjects.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No projects match your filters</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredAndSortedProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="group relative bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                                    >
                                        {/* Delete Button - Absolute positioned, subtle */}
                                        <button
                                            onClick={(e) => openDeleteModal(e, project.id, project.title)}
                                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="Delete project"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        {/* Card Content - Clickable Link */}
                                        <Link
                                            to={`/editor/${project.id}`}
                                            className="block p-5"
                                        >
                                            {/* Icon and Title */}
                                            <div className="flex items-start gap-4">
                                                {/* Icon with gradient background */}
                                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    project.type === 'docx'
                                                        ? 'bg-gradient-to-br from-blue-50 to-blue-100'
                                                        : 'bg-gradient-to-br from-purple-50 to-purple-100'
                                                }`}>
                                                    {project.type === 'docx' ? (
                                                        <FileText className="w-6 h-6 text-blue-600" />
                                                    ) : (
                                                        <Presentation className="w-6 h-6 text-purple-600" />
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">
                                                        {project.title}
                                                    </h3>
                                                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                                                        project.type === 'docx'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                        {project.type === 'docx' ? 'Document' : 'Presentation'}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
                projectTitle={deleteModal.projectTitle}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}