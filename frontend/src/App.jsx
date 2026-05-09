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
import { supabase } from './supabase';
import { Loader2 } from 'lucide-react';

function useSession() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const session = useSession();
  if (session === undefined) return <FullScreenLoader />;
  return session ? children : <Navigate to="/login" />;
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

  if (loading) return <FullScreenLoader />;

  if (projectType === 'pptx') {
    return <PresentationEditor />;
  } else if (projectType === 'docx') {
    return <DocumentEditor />;
  }

  return <Navigate to="/" />;
}

function App() {
  const session = useSession();

  if (session === undefined) return <FullScreenLoader />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/create" element={<PrivateRoute><ProjectSetup /></PrivateRoute>} />
        <Route path="/editor/:id" element={<PrivateRoute><EditorRouter /></PrivateRoute>} />
      </Routes>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </Router>
  );
}

export default App;
