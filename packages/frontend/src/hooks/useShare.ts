import { useState, useCallback } from 'react';
import { api } from '../utils/api';

interface UseShareResult {
  shareUrl: string | null;
  isShared: boolean;
  isLoading: boolean;
  enableShare: () => Promise<void>;
  disableShare: () => Promise<void>;
  regenerateLink: () => Promise<void>;
}

export function useShare(tripId?: string): UseShareResult {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const enableShare = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      const result = await api.post<{ shareToken: string }>(`/api/trips/${tripId}/share`);
      setShareToken(result.shareToken);
      setIsShared(true);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const disableShare = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      await api.del(`/api/trips/${tripId}/share`);
      setShareToken(null);
      setIsShared(false);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const regenerateLink = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      const result = await api.post<{ shareToken: string }>(
        `/api/trips/${tripId}/share/regenerate`
      );
      setShareToken(result.shareToken);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  return {
    shareUrl,
    isShared,
    isLoading,
    enableShare,
    disableShare,
    regenerateLink,
  };
}
