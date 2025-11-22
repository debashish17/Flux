import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import api from '../api';

export default function ChatSidebar({ projectId, isOpen, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Add welcome message
            setMessages([{
                role: 'assistant',
                content: 'Hello! I\'m here to help you with your project. Ask me anything about content ideas, improvements, or general questions!'
            }]);
        }
    }, [isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        setLoading(true);

        try {
            const response = await api.post('/chat/', {
                message: userMessage,
                project_id: projectId
            });

            // Add AI response to chat
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-indigo-500" />
                    <h2 className="font-semibold text-lg text-gray-900">AI Assistant</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                    title="Close chat"
                >
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-xl px-4 py-2 border text-sm shadow-sm ${message.role === 'user'
                                    ? 'bg-indigo-100 border-indigo-200 text-indigo-900'
                                    : 'bg-green-50 border-green-200 text-green-900'
                                }`}
                        >
                            <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 shadow-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
                {messages.length === 1 && (
                    <div className="mb-3 text-xs text-gray-600 bg-gray-100 rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold mb-1 text-indigo-700">Try asking:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Suggest improvements for this content</li>
                            <li>What should I add to this section?</li>
                            <li>Make this more engaging</li>
                        </ul>
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-900"
                        disabled={loading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
