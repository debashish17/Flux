import { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useSectionFeedback, useSubmitFeedback, useRemoveFeedback } from '../hooks/useFeedback';

export default function SectionFeedback({
    sectionId,
    projectId,
    cachedFeedback = null,
    onFeedbackChange = null,
    historyButton = null,
}) {
    // Only fetch per-section if no cached batch data was passed in.
    const { data: feedbackData } = useSectionFeedback(sectionId, cachedFeedback === null);
    const submitFeedback = useSubmitFeedback();
    const removeFeedback = useRemoveFeedback();

    // Like is persisted to backend; dislike is local-only (used to gate regeneration).
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [localComment, setLocalComment] = useState('');
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Track the latest dislike state so the debounced callback uses fresh values.
    const dislikedRef = useRef(false);
    useEffect(() => { dislikedRef.current = isDisliked; }, [isDisliked]);

    // Sync like state with whatever data source is available (props win).
    useEffect(() => {
        const fb = cachedFeedback ?? feedbackData;
        setIsLiked(fb?.userFeedback === 'LIKE');
    }, [cachedFeedback, feedbackData]);

    const propagate = (type, comment) => {
        if (onFeedbackChange) onFeedbackChange(type, comment);
    };

    const debouncedPropagate = useDebouncedCallback((comment) => {
        // Only fire if the section is still in dislike state at fire time.
        if (dislikedRef.current) propagate('DISLIKE', comment);
    }, 400);

    const handleLike = async () => {
        if (isLiked) {
            setIsLiked(false);
            propagate(null, null);
            try {
                await removeFeedback.mutateAsync({ sectionId, projectId });
            } catch (err) {
                setIsLiked(true);
                console.error('Failed to remove like:', err);
            }
        } else {
            setIsLiked(true);
            setIsDisliked(false);
            setShowCommentBox(false);
            setLocalComment('');
            propagate('LIKE', null);
            try {
                await submitFeedback.mutateAsync({ sectionId, type: 'LIKE', projectId });
            } catch (err) {
                setIsLiked(false);
                console.error('Failed to submit like:', err);
            }
        }
    };

    const handleDislike = () => {
        if (isDisliked) {
            setIsDisliked(false);
            setShowCommentBox(false);
            setLocalComment('');
            propagate(null, null);
        } else {
            setIsDisliked(true);
            setIsLiked(false);
            setShowCommentBox(true);
            setShowHistory(false);
            propagate('DISLIKE', '');
        }
    };

    const handleToggleHistory = () => {
        setShowHistory((v) => !v);
        if (!showHistory) setShowCommentBox(false);
    };

    const handleCommentChange = (e) => {
        const value = e.target.value;
        setLocalComment(value);
        // Auto-propagate as user types so global Regenerate sees fresh feedback
        // without requiring an explicit "Save" click.
        debouncedPropagate(value.trim());
    };

    const handleCancelFeedback = () => {
        setIsDisliked(false);
        setShowCommentBox(false);
        setLocalComment('');
        debouncedPropagate.cancel();
        propagate(null, null);
    };

    return (
        <div className="section-feedback">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${isLiked
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            }`}
                        title="Keep this section as-is (persisted)"
                    >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Like</span>
                    </button>

                    <button
                        onClick={handleDislike}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${isDisliked
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            }`}
                        title="Mark for regeneration with feedback"
                    >
                        <ThumbsDown className="w-4 h-4" />
                        <span className="text-sm font-medium">Dislike</span>
                    </button>

                    {(isLiked || isDisliked) && (
                        <span className="text-xs text-gray-500">
                            {isLiked
                                ? '✓ Liked (saved)'
                                : localComment.trim()
                                    ? '✓ Marked for regeneration'
                                    : 'Add feedback below'}
                        </span>
                    )}
                </div>

                {historyButton && (
                    <button
                        onClick={handleToggleHistory}
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                        {showHistory ? 'Hide History' : 'View History'}
                    </button>
                )}
            </div>

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
                        <button
                            onClick={handleCancelFeedback}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <p className="text-xs text-gray-600">
                            💡 Click global Regenerate when ready
                        </p>
                    </div>
                </div>
            )}

            {showHistory && historyButton && (
                <div className="mt-3">{historyButton}</div>
            )}
        </div>
    );
}
