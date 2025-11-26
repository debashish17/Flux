import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function SectionFeedback({ sectionId, initialFeedback = null, onFeedbackChange = null }) {
  const [userFeedback, setUserFeedback] = useState(initialFeedback); // "like", "dislike", or null
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [existingCommentId, setExistingCommentId] = useState(null);

  useEffect(() => {
    // Only load feedback if not provided via props
    if (initialFeedback === null) {
      loadFeedback();
    } else {
      setUserFeedback(initialFeedback);
      // Show comment box and load existing comment if disliked
      if (initialFeedback === 'dislike') {
        setShowCommentBox(true);
        loadComment();
      } else {
        // Reset comment box if feedback is not dislike
        setShowCommentBox(false);
        setFeedbackComment('');
      }
    }
  }, [sectionId, initialFeedback]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const loadComment = async () => {
    try {
      const comments = await api.get(`/feedback/sections/${sectionId}/comments`);
      if (comments.data.length > 0) {
        setFeedbackComment(comments.data[0].comment);
        setExistingCommentId(comments.data[0].id);
        setShowCommentBox(true);
      }
    } catch (error) {
      console.error('Failed to load comment:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/feedback/sections/${sectionId}`);
      setUserFeedback(response.data.userFeedback);

      // Load existing comment if user disliked
      if (response.data.userFeedback === 'dislike') {
        await loadComment();
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      if (userFeedback === 'like') {
        // Clicking like again removes it
        await api.delete(`/feedback/sections/${sectionId}`);
        setUserFeedback(null);
        if (onFeedbackChange) onFeedbackChange(null);
      } else {
        // Mark as liked (removes any existing feedback first)
        await api.post(`/feedback/sections/${sectionId}`, { type: 'like' });
        setUserFeedback('like');
        setShowCommentBox(false);
        setFeedbackComment('');
        setExistingCommentId(null);
        if (onFeedbackChange) onFeedbackChange('like');

        // Delete any existing comment
        if (existingCommentId) {
          try {
            await api.delete(`/feedback/sections/${sectionId}/comments/${existingCommentId}`);
          } catch (err) {
            console.log('No comment to delete');
          }
        }
      }
    } catch (error) {
      console.error('Failed to submit like:', error);
      alert('Failed to update feedback');
    }
  };

  const handleDislike = async () => {
    try {
      if (userFeedback === 'dislike') {
        // Clicking dislike again removes it
        await api.delete(`/feedback/sections/${sectionId}`);
        setUserFeedback(null);
        setShowCommentBox(false);
        setFeedbackComment('');
        if (onFeedbackChange) onFeedbackChange(null);

        // Delete the comment if we have the ID
        if (existingCommentId) {
          try {
            await api.delete(`/feedback/sections/${sectionId}/comments/${existingCommentId}`);
          } catch (err) {
            console.log('Comment already deleted');
          }
        }
        setExistingCommentId(null);
      } else {
        // Mark as disliked and show comment box
        await api.post(`/feedback/sections/${sectionId}`, { type: 'dislike' });
        setUserFeedback('dislike');
        setShowCommentBox(true);
        if (onFeedbackChange) onFeedbackChange('dislike');
      }
    } catch (error) {
      console.error('Failed to submit dislike:', error);
      alert('Failed to update feedback');
    }
  };

  const saveCommentToBackend = async (commentText) => {
    if (!commentText.trim()) {
      return false;
    }

    // Only save if user has actually disliked the section
    if (userFeedback !== 'dislike') {
      console.log('Cannot save comment: section not disliked yet');
      return false;
    }

    try {
      // If we have an existing comment ID, delete it first
      if (existingCommentId) {
        try {
          await api.delete(`/feedback/sections/${sectionId}/comments/${existingCommentId}`);
        } catch (deleteError) {
          // Comment might already be deleted, continue
          console.log('Comment already deleted or not found');
        }
      }

      // Create new comment
      const response = await api.post(`/feedback/sections/${sectionId}/comments`, {
        comment: commentText
      });

      // Store the new comment ID
      if (response.data && response.data.id) {
        setExistingCommentId(response.data.id);
      }

      return true;
    } catch (error) {
      console.error('Failed to save comment:', error);
      // Don't show error to user for auto-save failures
      return false;
    }
  };

  const handleSaveComment = async () => {
    if (!feedbackComment.trim()) {
      return;
    }

    const success = await saveCommentToBackend(feedbackComment);

    if (success) {
      // Show saved indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCommentChange = (e) => {
    const newComment = e.target.value;
    setFeedbackComment(newComment);

    // Reset saved state when user types
    if (saved) setSaved(false);

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new auto-save timer (1.5 seconds after user stops typing)
    if (newComment.trim()) {
      setAutoSaving(true);
      const timer = setTimeout(async () => {
        const success = await saveCommentToBackend(newComment);
        setAutoSaving(false);
        if (success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }, 1500); // Auto-save after 1.5 seconds of inactivity

      setAutoSaveTimer(timer);
    } else {
      setAutoSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="section-feedback">
      {/* Feedback Buttons */}
      <div className="flex items-center gap-3 mb-3">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            userFeedback === 'like'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
          }`}
          title="Keep this section as-is"
        >
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm font-medium">Like</span>
        </button>

        {/* Dislike Button */}
        <button
          onClick={handleDislike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            userFeedback === 'dislike'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
          }`}
          title="Mark for regeneration with feedback"
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="text-sm font-medium">Dislike</span>
        </button>

        {userFeedback && (
          <span className="text-xs text-gray-500">
            {userFeedback === 'like' ? '✓ Keeping this section' : '✓ Marked for regeneration'}
          </span>
        )}
      </div>

      {/* Feedback Comment Box (only shown when disliked) */}
      {showCommentBox && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What needs to be improved? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={feedbackComment}
            onChange={handleCommentChange}
            placeholder="e.g., Too technical, needs more examples, wrong tone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 min-h-24 text-sm resize-none"
          />
          <div className="mt-3">
            <div className="flex items-center gap-3">
              {/* Auto-save status indicator */}
              {autoSaving && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Saving...</span>
                </div>
              )}
              {saved && !autoSaving && (
                <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Auto-saved</span>
                </div>
              )}
              {!autoSaving && !saved && feedbackComment.trim() && (
                <span className="text-xs text-gray-500">
                  Type to auto-save...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Click "Regenerate" to apply feedback
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
