import { Link } from 'react-router-dom';
import { FileText, Presentation, Sparkles, ArrowRight, Check, Zap, Shield, Users, Clock, Download, Star } from 'lucide-react';

export default function Landing() {

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Navigation */}
            <nav className="border-b border-white/20 sticky top-0 bg-white/70 backdrop-blur-xl z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Flux</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="px-5 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/login"
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6">
                <div className="pt-28 pb-24 text-center relative">
                    {/* Decorative blur effects */}
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-md border border-white/40 rounded-full mb-8 shadow-lg">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Powered by Advanced AI Technology</span>
                        </div>
                        
                        <div className="max-w-5xl mx-auto mb-10">
                            <h2 className="text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
                                Create Professional
                                <br />
                                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Documents in Seconds</span>
                            </h2>
                            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                                Transform your ideas into polished Word documents and PowerPoint presentations with the power of AI. Skip the blank page and start creating instantly.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-16">
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                            >
                                Start Creating Free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button className="px-10 py-4 bg-white/70 backdrop-blur-md border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Watch Demo
                            </button>
                        </div>

                    </div>
                </div>

                {/* Feature Cards Section */}
                <div className="py-16 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        {/* Document Card with Glassmorphism */}
                        <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-12 shadow-2xl hover:shadow-blue-500/20 transition-all group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                    <FileText className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-4">Word Documents</h3>
                                <p className="text-gray-700 leading-relaxed mb-8 text-lg">
                                    Create professional documents with AI-powered content generation. From business reports to research papers, structure and write with ease.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Smart content suggestions</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Professional formatting</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Export to DOCX format</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Presentation Card with Glassmorphism */}
                        <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-12 shadow-2xl hover:shadow-purple-500/20 transition-all group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                    <Presentation className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-4">PowerPoint Presentations</h3>
                                <p className="text-gray-700 leading-relaxed mb-8 text-lg">
                                    Build stunning presentations with intelligent slide planning. Perfect for pitches, reports, and educational content that captivates.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Auto-generated slide layouts</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Content recommendations</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="text-gray-700 font-medium">Export to PPTX format</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How It Works Section */}
                <div className="py-24">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-20">
                            <h3 className="text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">
                                How It Works
                            </h3>
                            <p className="text-xl text-gray-600">
                                Get from idea to finished document in three simple steps
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="relative bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl text-center group hover:-translate-y-2 transition-all">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-black shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-transform">
                                    1
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-4">Describe Your Vision</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Tell our AI what you want to create. Just type your topic, goals, and any key points you want to include.
                                </p>
                            </div>
                            
                            <div className="relative bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl text-center group hover:-translate-y-2 transition-all">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-black shadow-lg shadow-purple-500/40 group-hover:scale-110 transition-transform">
                                    2
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-4">AI Creates Your Document</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Watch as Flux generates professionally structured content, complete with formatting and organization.
                                </p>
                            </div>
                            
                            <div className="relative bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl text-center group hover:-translate-y-2 transition-all">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-black shadow-lg shadow-green-500/40 group-hover:scale-110 transition-transform">
                                    3
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-4">Refine & Download</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Chat with AI to make adjustments, then download your polished document ready to share or present.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="py-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h3 className="text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">
                                Why Choose Flux?
                            </h3>
                            <p className="text-xl text-gray-600">
                                Everything you need to create amazing documents, faster
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-5">
                                    <Sparkles className="w-7 h-7 text-blue-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Intelligence</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Leverages Google Gemini AI for smart, context-aware content generation that understands your needs.
                                </p>
                            </div>

                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-5">
                                    <Clock className="w-7 h-7 text-green-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Save Hours of Work</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    What used to take hours now takes minutes. Focus on ideas while AI handles the heavy lifting.
                                </p>
                            </div>

                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-5">
                                    <Download className="w-7 h-7 text-purple-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Professional Export</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Download perfectly formatted DOCX and PPTX files ready for immediate use or further editing.
                                </p>
                            </div>

                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-5">
                                    <Zap className="w-7 h-7 text-orange-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Instant Generation</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Get your documents in seconds, not hours. Our AI works at lightning speed to bring your ideas to life.
                                </p>
                            </div>

                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mb-5">
                                    <Shield className="w-7 h-7 text-red-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Your documents and data are encrypted and secure. We take your privacy seriously.
                                </p>
                            </div>

                            <div className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mb-5">
                                    <Users className="w-7 h-7 text-indigo-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Built for Everyone</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Perfect for students, professionals, and teams. Intuitive interface that anyone can master.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="py-24">
                    <div className="max-w-5xl mx-auto text-center">
                        <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-16 shadow-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
                            <div className="relative z-10">
                                <h3 className="text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">
                                    Ready to Transform Your Workflow?
                                </h3>
                                <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
                                    Join thousands of users creating better documents faster with AI-powered assistance.
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-bold rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/50 hover:-translate-y-1"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-6 h-6" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/20 bg-white/30 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-16 rounded-3xl border border-gray-200 bg-white/70 shadow-xl mt-16">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Flux</span>
                            </div>
                            <p className="text-gray-600 mb-5 max-w-sm leading-relaxed">
                                AI-powered document generation that helps you create professional content in seconds. Experience the future of productivity.
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-lg">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Powered by Google Gemini AI</span>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 mb-4 text-lg">Product</h4>
                            <ul className="space-y-3 text-gray-600">
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Features</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Pricing</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Examples</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Updates</a></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 mb-4 text-lg">Company</h4>
                            <ul className="space-y-3 text-gray-600">
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">About</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Contact</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Privacy</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border-t border-white/20 pt-8">
                        <p className="text-center text-gray-500 font-medium">
                            © 2024 Flux. All rights reserved. Empowering creativity with AI.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}