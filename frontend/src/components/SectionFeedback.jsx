
import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { useSectionFeedback, useSubmitFeedback, useRemoveFeedback } from '../hooks/useFeedback';

export default function SectionFeedback({ sectionId, projectId, initialFeedback = null, initialComment = '', onFeedbackChange = null, onRegenerate = null, historyButton = null }) {
  // Fetch like status from backend (enabled by default to load existing likes on mount)
  const { data: feedbackData } = useSectionFeedback(sectionId, true);
  const submitFeedback = useSubmitFeedback();
  const removeFeedback = useRemoveFeedback();

  // Local state for like (synced with backend) and dislike (temporary, local only)
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [localComment, setLocalComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync like state with backend data when it loads
  useEffect(() => {
    if (feedbackData?.userFeedback === 'LIKE') {
      setIsLiked(true);
    } else {
      setIsLiked(false);
    }
  }, [feedbackData]);

  const handleLike = async () => {
    if (isLiked) {
      // Optimistic update: Remove like immediately in UI
      setIsLiked(false);
      if (onFeedbackChange) onFeedbackChange(null, null);

      // Then send API call in background
      try {
        await removeFeedback.mutateAsync({ sectionId });
      } catch (error) {
        // Rollback on error
        setIsLiked(true);
        console.error('Failed to remove like:', error);
      }
    } else {
      // Optimistic update: Add like immediately in UI
      setIsLiked(true);
      setIsDisliked(false); // Remove dislike if present
      setShowCommentBox(false);
      setLocalComment('');
      if (onFeedbackChange) onFeedbackChange('LIKE', null);

      // Then send API call in background
      try {
        await submitFeedback.mutateAsync({ sectionId, type: 'LIKE' });
      } catch (error) {
        // Rollback on error
        setIsLiked(false);
        console.error('Failed to submit like:', error);
      }
    }
  };

  const handleDislike = () => {
    // Dislike is local only - no backend persistence needed
    if (isDisliked) {
      // Remove dislike
      setIsDisliked(false);
      setShowCommentBox(false);
      setLocalComment('');
      if (onFeedbackChange) onFeedbackChange(null, null);
    } else {
      // Add dislike (local only)
      setIsDisliked(true);
      setIsLiked(false); // Remove like if present
      setShowCommentBox(true);
      setShowHistory(false); // Close history when opening feedback
      if (onFeedbackChange) onFeedbackChange('DISLIKE', null);
    }
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      // Close feedback box when opening history
      setShowCommentBox(false);
    }
  };

  const handleCommentChange = (e) => {
    setLocalComment(e.target.value);
  };

  const handleSaveFeedback = () => {
    // Just close the comment box - feedback is saved in local state
    // Global regenerate button will use this feedback
    if (localComment.trim()) {
      setShowCommentBox(false);
      // Notify parent that feedback is ready
      if (onFeedbackChange) onFeedbackChange('DISLIKE', localComment.trim());
    }
  };

  const handleCancelFeedback = () => {
    // Cancel and remove dislike
    setIsDisliked(false);
    setShowCommentBox(false);
    setLocalComment('');
    if (onFeedbackChange) onFeedbackChange(null);
  };

  return (
    <div className="section-feedback">
      {/* Feedback Buttons */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              isLiked
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
            title="Keep this section as-is (persisted)"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">Like</span>
          </button>

          {/* Dislike Button */}
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              isDisliked
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
            title="Mark for regeneration with feedback (temporary)"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-sm font-medium">Dislike</span>
          </button>

          {(isLiked || isDisliked) && (
            <span className="text-xs text-gray-500">
              {isLiked ? '✓ Liked (saved)' : '✓ Marked for regeneration'}
            </span>
          )}
        </div>

        {/* History Toggle Button - aligned to the right */}
        {historyButton && (
          <button
            onClick={handleToggleHistory}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        )}
      </div>

      {/* Feedback Comment Box (only shown when disliked) */}
      {showCommentBox && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What needs to be improved? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={localComment}
            onChange={handleCommentChange}
            placeholder="e.g., Too technical, needs more examples, wrong tone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 min-h-24 text-sm resize-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveFeedback}
                disabled={!localComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                Save Feedback
              </button>
              <button
                onClick={handleCancelFeedback}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-600">
              💡 Use global Regenerate button
            </p>
          </div>
        </div>
      )}

      {/* Show saved feedback indicator when comment box is closed but feedback exists */}
      {isDisliked && !showCommentBox && localComment && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium mb-1">Feedback saved:</p>
              <p className="text-xs text-gray-600 italic">"{localComment}"</p>
            </div>
            <button
              onClick={() => setShowCommentBox(true)}
              className="ml-3 text-xs text-orange-600 hover:text-orange-700 underline"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* History Panel - shown inline when toggled */}
      {showHistory && historyButton && (
        <div className="mt-3">
          {historyButton}
        </div>
      )}
    </div>
  );
}
