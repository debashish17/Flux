import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectSetup from './pages/ProjectSetup';
import DocumentEditor from './pages/DocumentEditor';
import PresentationEditor from './pages/PresentationEditor';
import api from './api';
import { Loader2 } from 'lucide-react';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function EditorRouter() {
  const { id } = useParams();
  const [projectType, setProjectType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectType = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProjectType(res.data.type);
      } catch (error) {
        console.error('Failed to fetch project type', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectType();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (projectType === 'pptx') {
    return <PresentationEditor />;
  } else if (projectType === 'docx') {
    return <DocumentEditor />;
  }

  return <Navigate to="/" />;
}

function App() {
  const token = localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/create" element={<PrivateRoute><ProjectSetup /></PrivateRoute>} />
        <Route path="/editor/:id" element={<PrivateRoute><EditorRouter /></PrivateRoute>} />
      </Routes>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </Router>
  );
}

export default App;
