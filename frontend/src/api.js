import axios from 'axios';

const USE_MOCK = false;

// Mock Data
const MOCK_USER = { email: 'test@example.com' };
const MOCK_TOKEN = 'mock-jwt-token';
const MOCK_PROJECTS = [
    {
        id: 1, title: 'Q3 Market Analysis', type: 'docx', sections: [
            { id: 1, title: 'Executive Summary', content: 'This is a mock executive summary.', order_index: 0 },
            { id: 2, title: 'Market Trends', content: 'Market is trending upwards.', order_index: 1 }
        ]
    },
    {
        id: 2, title: 'Investor Pitch', type: 'pptx', sections: [
            { id: 3, title: 'Problem', content: 'The problem is X.', order_index: 0 },
            { id: 4, title: 'Solution', content: 'The solution is Y.', order_index: 1 }
        ]
    }
];

// Custom Adapter for Mocking
const mockAdapter = async (config) => {
    console.log(`[MOCK API] ${config.method.toUpperCase()} ${config.url}`);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const url = config.url.replace(config.baseURL || '', '');

            // Auth
            if (url.endsWith('/token') || url.endsWith('/signup')) {
                console.log('Mock Auth Success');
                resolve({
                    data: { access_token: MOCK_TOKEN, token_type: 'bearer' },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config
                });
            }

            // Projects
            else if (url.includes('/projects/plan') && config.method === 'post') {
                const data = JSON.parse(config.data);
                const mockStructure = {
                    title: data.type === 'pptx'
                        ? 'Mock Presentation Title'
                        : 'Mock Document Title',
                    sections: data.type === 'pptx'
                        ? ['Introduction', 'Main Topic', 'Key Points', 'Analysis', 'Conclusion']
                        : ['Executive Summary', 'Introduction', 'Main Content', 'Analysis', 'Conclusion'],
                    type: data.type
                };
                resolve({ data: mockStructure, status: 200, statusText: 'OK', headers: {}, config });
            }
            else if (url.includes('/projects') && config.method === 'get') {
                // Handle /projects/ vs /projects/1
                if (url.match(/\/projects\/\d+/)) {
                    const id = parseInt(url.split('/').pop());
                    const project = MOCK_PROJECTS.find(p => p.id === id);
                    if (project) resolve({ data: project, status: 200, statusText: 'OK', headers: {}, config });
                    else reject({ response: { status: 404 }, config });
                } else {
                    resolve({ data: MOCK_PROJECTS, status: 200, statusText: 'OK', headers: {}, config });
                }
            }
            else if (url.includes('/projects') && config.method === 'post') {
                const data = JSON.parse(config.data);
                const newProject = {
                    id: Math.floor(Math.random() * 1000),
                    title: data.title,
                    type: data.type,
                    sections: data.initial_sections.map((t, i) => ({
                        id: Math.floor(Math.random() * 1000),
                        title: t,
                        content: '',
                        order_index: i
                    }))
                };
                MOCK_PROJECTS.push(newProject);
                resolve({ data: newProject, status: 200, statusText: 'OK', headers: {}, config });
            }
            else if (url.includes('/projects') && config.method === 'delete') {
                const id = parseInt(url.split('/').pop());
                const index = MOCK_PROJECTS.findIndex(p => p.id === id);
                if (index !== -1) {
                    MOCK_PROJECTS.splice(index, 1);
                    resolve({ data: { message: 'Project deleted successfully' }, status: 200, statusText: 'OK', headers: {}, config });
                } else {
                    reject({ response: { status: 404, statusText: 'Project not found' }, config });
                }
            }

            // Generation
            else if (url.includes('/generate/section/')) {
                resolve({ data: { content: "This is AI generated mock content. The real API is bypassed." }, status: 200, statusText: 'OK', headers: {}, config });
            }
            else if (url.includes('/generate/refine/')) {
                resolve({ data: { content: "This is REFINED mock content. The real API is bypassed." }, status: 200, statusText: 'OK', headers: {}, config });
            }

            // Export
            else if (url.includes('/export/')) {
                resolve({ data: new Blob(["Mock File Content"], { type: 'text/plain' }), status: 200, statusText: 'OK', headers: {}, config });
            }

            else {
                // Pass through to real XHR if we wanted, but here we just 404
                reject({ response: { status: 404, statusText: 'Not Found (Mock)' }, config });
            }
        }, 500); // Simulate delay
    });
};

const api = axios.create({
    baseURL: 'http://localhost:8000',
    // Use mock adapter if enabled, otherwise default (undefined means default)
    adapter: USE_MOCK ? mockAdapter : undefined
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If we get a 401 Unauthorized, clear token and redirect to login
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
