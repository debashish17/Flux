import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isLogin ? '/token' : '/signup';
            const payload = isLogin
                ? new URLSearchParams({ username: email, password })
                : { email, password };

            console.log('Attempting login to:', endpoint);
            const response = await api.post(endpoint, payload, {
                headers: isLogin ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}
            });

            console.log('Login Response:', response);

            if (response.data && response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
                // Clear any cached data from previous user
                sessionStorage.removeItem('dashboard_projects');
                sessionStorage.removeItem('dashboard_cache_timestamp');
                sessionStorage.removeItem('refresh_dashboard');
                navigate('/');
            } else {
                console.error('Invalid response structure:', response);
                alert('Login failed: Invalid server response');
            }
        } catch (error) {
            console.error('Login Error:', error);

            // Parse error response for specific error messages
            let errorMessage = 'Authentication failed';

            if (error.response) {
                // Server responded with error
                if (error.response.status === 401) {
                    errorMessage = isLogin
                        ? 'Invalid email or password'
                        : 'Email already registered';
                } else if (error.response.status === 422) {
                    errorMessage = 'Please check your email and password format';
                } else if (error.response.data?.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response.status === 500) {
                    errorMessage = 'Server error. Please try again later';
                }
            } else if (error.request) {
                // Network error
                errorMessage = 'Network error. Check your connection';
            }

            alert(errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Flux</h1>
                    <p className="text-gray-600">{isLogin ? 'Welcome back' : 'Create your account'}</p>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
