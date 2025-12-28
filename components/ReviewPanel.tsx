
import React, { useState } from 'react';
import {
  MessageSquare, Check, X, AlertCircle, ChevronDown, ChevronRight,
  ThumbsUp, ThumbsDown, Send, Clock, User, Bot, FileCode, Plus
} from 'lucide-react';
import { FileDiff } from '../types';

type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'commented';

type ReviewComment = {
  id: string;
  author: string;
  isBot: boolean;
  content: string;
  timestamp: number;
  file?: string;
  line?: number;
  status?: 'resolved' | 'unresolved';
  replies?: ReviewComment[];
};

type ReviewThread = {
  id: string;
  file: string;
  line: number;
  comments: ReviewComment[];
  status: 'open' | 'resolved';
};

interface ReviewPanelProps {
  diffs: FileDiff[];
  workspaceId?: string;
  prNumber?: number;
  prTitle?: string;
  onStartReview?: () => void;
  onSubmitReview?: (status: ReviewStatus, summary: string) => void;
  onViewDiff?: (diff: FileDiff) => void;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({
  diffs,
  workspaceId,
  prNumber,
  prTitle,
  onStartReview,
  onSubmitReview,
  onViewDiff
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'threads' | 'ai'>('overview');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('pending');
  const [reviewSummary, setReviewSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');

  // Mock threads for demo
  const [threads] = useState<ReviewThread[]>([
    {
      id: '1',
      file: 'src/components/ChatInterface.tsx',
      line: 45,
      status: 'open',
      comments: [
        {
          id: '1a',
          author: 'reviewer',
          isBot: false,
          content: 'Consider memoizing this callback to prevent unnecessary re-renders',
          timestamp: Date.now() - 3600000,
        }
      ]
    },
    {
      id: '2',
      file: 'src/services/gitService.ts',
      line: 23,
      status: 'resolved',
      comments: [
        {
          id: '2a',
          author: 'Claude',
          isBot: true,
          content: 'This error handling could be more specific. Consider catching different error types separately.',
          timestamp: Date.now() - 7200000,
        },
        {
          id: '2b',
          author: 'you',
          isBot: false,
          content: 'Good point, I\'ll add specific error handlers.',
          timestamp: Date.now() - 3600000,
        }
      ]
    }
  ]);

  const handleAiReview = async () => {
    setIsAnalyzing(true);
    setAiSuggestions([]);

    try {
      const API_BASE = (import.meta as any).env?.VITE_CONDUCTOR_API_BASE || '/api';
      const response = await fetch(`${API_BASE}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diffs,
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI review');
      }

      const result = await response.json();
      if (result.success && result.review) {
        const review = result.review;
        const suggestions: string[] = [];

        // Combine suggestions and issues
        if (review.suggestions) {
          suggestions.push(...review.suggestions);
        }
        if (review.issues) {
          suggestions.push(...review.issues.map((i: string) => `⚠️ ${i}`));
        }
        if (review.security) {
          suggestions.push(`🔒 Security: ${review.security}`);
        }

        // Add summary at the top
        if (review.summary) {
          suggestions.unshift(`📋 ${review.summary}`);
        }

        setAiSuggestions(suggestions);
      }
    } catch (error) {
      console.error('AI review failed:', error);
      setAiSuggestions(['Failed to complete AI review. Please try again.']);
    }

    setIsAnalyzing(false);
    setActiveTab('ai');
  };

  const handleSubmitReview = () => {
    if (onSubmitReview) {
      onSubmitReview(reviewStatus, reviewSummary);
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const openThreads = threads.filter(t => t.status === 'open');
  const resolvedThreads = threads.filter(t => t.status === 'resolved');

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Code Review</h3>
          </div>
          {prNumber && (
            <span className="text-xs text-white/40">PR #{prNumber}</span>
          )}
        </div>
        {prTitle && (
          <p className="text-xs text-white/60 truncate">{prTitle}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('threads')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'threads' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Threads
          {openThreads.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
              {openThreads.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'ai' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Bot size={12} /> AI Review
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <p className="text-lg font-bold text-white">{diffs.length}</p>
                <p className="text-[10px] text-white/40 uppercase">Files</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl text-center">
                <p className="text-lg font-bold text-green-400">
                  +{diffs.reduce((sum, d) => sum + d.added, 0)}
                </p>
                <p className="text-[10px] text-green-400/60 uppercase">Added</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-center">
                <p className="text-lg font-bold text-red-400">
                  -{diffs.reduce((sum, d) => sum + d.removed, 0)}
                </p>
                <p className="text-[10px] text-red-400/60 uppercase">Removed</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleAiReview}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl border border-purple-500/30 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Bot size={16} />
                    Run AI Review
                  </>
                )}
              </button>

              <button
                onClick={onStartReview}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 transition-colors"
              >
                <MessageSquare size={16} />
                Start Review
              </button>
            </div>

            {/* Submit Review */}
            <div className="p-4 bg-white/5 rounded-xl space-y-4 border border-white/10">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Submit Review
              </h4>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewStatus('approved')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reviewStatus === 'approved'
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => setReviewStatus('changes_requested')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reviewStatus === 'changes_requested'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <X size={14} /> Request
                </button>
                <button
                  onClick={() => setReviewStatus('commented')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reviewStatus === 'commented'
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <MessageSquare size={14} /> Comment
                </button>
              </div>

              <textarea
                value={reviewSummary}
                onChange={(e) => setReviewSummary(e.target.value)}
                placeholder="Leave a comment..."
                className="w-full h-24 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-white/20"
              />

              <button
                onClick={handleSubmitReview}
                disabled={!reviewSummary.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} /> Submit Review
              </button>
            </div>
          </div>
        )}

        {activeTab === 'threads' && (
          <div className="space-y-4">
            {openThreads.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={12} /> Open ({openThreads.length})
                </h4>
                {openThreads.map(thread => {
                  const matchingDiff = diffs.find(d => d.path.endsWith(thread.file));
                  return (
                  <div key={thread.id} className="p-3 bg-white/5 rounded-xl space-y-3 border border-white/10">
                    <button
                      onClick={() => matchingDiff && onViewDiff?.(matchingDiff)}
                      className="flex items-center gap-2 text-xs text-white/40 hover:text-blue-400 transition-colors"
                    >
                      <FileCode size={12} />
                      <span className="font-mono">{thread.file}</span>
                      <span>:</span>
                      <span className="text-white/60">line {thread.line}</span>
                    </button>
                    {thread.comments.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          {comment.isBot ? (
                            <Bot size={12} className="text-purple-400" />
                          ) : (
                            <User size={12} className="text-white/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white/80">{comment.author}</span>
                            <span className="text-[10px] text-white/20">{formatTimestamp(comment.timestamp)}</span>
                          </div>
                          <p className="text-xs text-white/60">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <input
                        type="text"
                        placeholder="Reply..."
                        className="flex-1 px-2 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white placeholder:text-white/20 outline-none"
                      />
                      <button className="p-1.5 bg-blue-600 rounded text-white hover:bg-blue-500 transition-colors">
                        <Send size={12} />
                      </button>
                      <button className="p-1.5 bg-green-600/20 rounded text-green-400 hover:bg-green-600/30 transition-colors">
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {resolvedThreads.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
                  <Check size={12} /> Resolved ({resolvedThreads.length})
                </h4>
                {resolvedThreads.map(thread => (
                  <div key={thread.id} className="p-3 bg-white/5 rounded-xl space-y-2 opacity-60">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <FileCode size={12} />
                      <span className="font-mono">{thread.file}</span>
                      <span>:</span>
                      <span className="text-white/60">line {thread.line}</span>
                    </div>
                    <p className="text-xs text-white/40 line-through">
                      {thread.comments[0]?.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {threads.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm">
                No review threads yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            {aiSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <Bot size={32} className="mx-auto mb-4 text-white/20" />
                <p className="text-sm text-white/40 mb-4">
                  AI Review not started yet.
                </p>
                <button
                  onClick={handleAiReview}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg border border-purple-500/30 transition-colors text-sm"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start AI Review'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <Bot size={12} /> AI Suggestions
                  </h4>
                  <span className="text-[10px] text-white/40">{aiSuggestions.length} items</span>
                </div>
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-start gap-3"
                  >
                    <AlertCircle size={14} className="text-purple-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-white/80">{suggestion}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-green-400 hover:bg-green-500/10 rounded transition-colors">
                          <ThumbsUp size={10} /> Helpful
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:bg-white/5 rounded transition-colors">
                          <ThumbsDown size={10} /> Not helpful
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                          <Plus size={10} /> Create issue
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPanel;
