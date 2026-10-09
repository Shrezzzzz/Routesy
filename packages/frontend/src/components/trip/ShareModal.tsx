import { useState } from 'react';
import { Copy, Check, RefreshCw, Globe, Lock } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  shareToken?: string;
  isPublic: boolean;
  tripId: string;
  onTogglePublic: (isPublic: boolean) => Promise<void>;
  onRegenerateLink: () => Promise<void>;
}

export function ShareModal({
  open,
  onClose,
  shareToken,
  isPublic,
  onTogglePublic,
  onRegenerateLink,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const input = document.querySelector<HTMLInputElement>('#share-url-input');
      input?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onTogglePublic(!isPublic);
    } finally {
      setToggling(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerateLink();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Share Trip">
      <div className="space-y-4">
        {/* Public toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="w-5 h-5 text-green-500" aria-hidden="true" />
            ) : (
              <Lock className="w-5 h-5 text-slate-400" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {isPublic ? 'Public' : 'Private'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isPublic
                  ? 'Anyone with the link can view this trip'
                  : 'Only you can see this trip'}
              </p>
            </div>
          </div>
          <Button
            variant={isPublic ? 'secondary' : 'primary'}
            size="sm"
            loading={toggling}
            onClick={handleToggle}
          >
            {isPublic ? 'Make Private' : 'Make Public'}
          </Button>
        </div>

        {/* Share URL */}
        {isPublic && shareUrl && (
          <>
            <div>
              <label htmlFor="share-url-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Share link
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-url-input"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied!' : 'Copy link'}
                  className={cn(
                    'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors',
                    copied
                      ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {copied ? (
                    <Check className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              loading={regenerating}
              onClick={handleRegenerate}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Regenerate Link
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
