import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { FileText, Plus, Presentation, Trash2, Search, SlidersHorizontal, Copy, Clock, LogOut } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function Dashboard() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, projectId: null, projectTitle: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [cloningProjectId, setCloningProjectId] = useState(null);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // recent, name-asc, name-desc, type
    const [filterType, setFilterType] = useState('all'); // all, docx, pptx
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = () => {
        setLoading(true);
        api.get('/projects/')
            .then(res => {
                setProjects(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load projects');
                setLoading(false);
            });
    };

    const handleClone = async (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
        setCloningProjectId(projectId);
        setError('');

        try {
            const response = await api.post(`/projects/${projectId}/clone`);
            setProjects([response.data, ...projects]);
        } catch (error) {
            console.error('Failed to clone project', error);
            setError('Failed to clone project. Please try again.');
        } finally {
            setCloningProjectId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
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

    // Format date to relative time or absolute
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAndSortedProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        to={`/editor/${project.id}`}
                                        className="group relative block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-4 mb-4">
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
                                                <span className="inline-block text-xs text-gray-500 uppercase font-medium px-2 py-1 bg-gray-100 rounded">
                                                    {project.type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Last Modified */}
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Updated {formatDate(project.updatedAt)}</span>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleClone(e, project.id)}
                                                disabled={cloningProjectId === project.id}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                title="Clone project"
                                            >
                                                {cloningProjectId === project.id ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                                                        Cloning...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        Clone
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => openDeleteModal(e, project.id, project.title)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Delete project"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </Link>
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
                isDeleting={isDeleting}
            />
        </div>
    );
}