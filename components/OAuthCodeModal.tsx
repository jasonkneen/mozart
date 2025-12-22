import React, { useState, useEffect, useRef } from 'react';
import { X, Key, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import { openOAuthWindow } from '../services/oauthService';

interface OAuthCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  authUrl?: string;
}

const OAuthCodeModal: React.FC<OAuthCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  authUrl
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      // Focus input after a small delay to allow modal to render
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError('Please enter the authorization code');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(trimmedCode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAuth = () => {
    if (authUrl) {
      openOAuthWindow(authUrl);
    }
  };

  const handleCopyUrl = async () => {
    if (authUrl) {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Key size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Enter Authorization Code</h2>
              <p className="text-xs text-white/50">Complete your Claude login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm text-white/70">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p>Open the Claude authorization page</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleOpenAuth}
                    disabled={!authUrl}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <ExternalLink size={14} />
                    Open Authorization Page
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    disabled={!authUrl}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-white/70">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
              <p>Sign in and authorize the application</p>
            </div>

            <div className="flex items-start gap-3 text-sm text-white/70">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
              <p>Copy the authorization code from the page and paste it below</p>
            </div>
          </div>

          {/* Code Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Authorization Code</label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your authorization code here"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Completing...
                </>
              ) : (
                'Complete Login'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OAuthCodeModal;
