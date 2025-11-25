import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function SectionFeedback({ sectionId }) {
  const [userFeedback, setUserFeedback] = useState(null); // "like", "dislike", or null
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [sectionId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/feedback/sections/${sectionId}`);
      setUserFeedback(response.data.userFeedback);

      // Load existing comment if user disliked
      if (response.data.userFeedback === 'dislike') {
        const comments = await api.get(`/feedback/sections/${sectionId}/comments`);
        if (comments.data.length > 0) {
          setFeedbackComment(comments.data[0].comment);
          setShowCommentBox(true);
        }
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
      } else {
        // Mark as liked (removes any existing feedback first)
        await api.post(`/feedback/sections/${sectionId}`, { type: 'like' });
        setUserFeedback('like');
        setShowCommentBox(false);
        setFeedbackComment('');

        // Delete any existing comment
        try {
          const comments = await api.get(`/feedback/sections/${sectionId}/comments`);
          if (comments.data.length > 0) {
            await api.delete(`/feedback/sections/${sectionId}/comments/${comments.data[0].id}`);
          }
        } catch (err) {
          console.log('No comment to delete');
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

        // Delete the comment
        const comments = await api.get(`/feedback/sections/${sectionId}/comments`);
        if (comments.data.length > 0) {
          await api.delete(`/feedback/sections/${sectionId}/comments/${comments.data[0].id}`);
        }
      } else {
        // Mark as disliked and show comment box
        await api.post(`/feedback/sections/${sectionId}`, { type: 'dislike' });
        setUserFeedback('dislike');
        setShowCommentBox(true);
      }
    } catch (error) {
      console.error('Failed to submit dislike:', error);
      alert('Failed to update feedback');
    }
  };

  const handleSaveComment = async () => {
    if (!feedbackComment.trim()) {
      return;
    }

    try {
      // Check if comment already exists
      const existingComments = await api.get(`/feedback/sections/${sectionId}/comments`);

      if (existingComments.data.length > 0) {
        // Update existing comment by deleting and recreating
        await api.delete(`/feedback/sections/${sectionId}/comments/${existingComments.data[0].id}`);
      }

      // Create new comment
      await api.post(`/feedback/sections/${sectionId}/comments`, {
        comment: feedbackComment
      });

      // Show saved indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save comment:', error);
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
            onChange={(e) => {
              setFeedbackComment(e.target.value);
              // Reset saved state when user types
              if (saved) setSaved(false);
            }}
            placeholder="e.g., Too technical, needs more examples, wrong tone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 min-h-24 text-sm resize-none"
          />
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveComment}
                disabled={!feedbackComment.trim() || saved}
                className={`px-4 py-1.5 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  saved ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {saved ? '✓ Saved' : 'Save Feedback'}
              </button>
              {saved && (
                <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Feedback saved!
                  </span>
                </div>
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
