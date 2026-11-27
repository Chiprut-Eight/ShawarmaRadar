import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  MessageCircle,
  Share2,
  Instagram,
  Facebook,
} from 'lucide-react';
import type { PlayerGender, RoundEvaluation } from '../../game/shawarmaGameConfig';
import { trackUserAction } from '../../services/analytics';
import './ShareDrawer.css';

interface ShareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  gender: PlayerGender;
  evaluation: RoundEvaluation;
  cardBlob: Blob | null;
  cardPreviewUrl: string | null;
  isGenerating: boolean;
}

const ShareDrawer: React.FC<ShareDrawerProps> = ({
  isOpen,
  onClose,
  playerName,
  gender,
  evaluation,
  cardBlob,
  cardPreviewUrl,
  isGenerating,
}) => {
  const { t, i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const playUrl = `${window.location.origin}/play`;
  const rankTitle = isHe ? evaluation.rank.titleHe : evaluation.rank.titleEn;

  const dishBreakdown = evaluation.dishes
    .map((d) => `${isHe ? d.labelHe : d.labelEn}: ${d.actualGrams}/${d.targetGrams}g (${d.accuracy}%)`)
    .join(' | ');

  const roleHe = gender === 'female' ? 'השווארמולוגית' : 'השווארמולוג';
  const achievedVerb = gender === 'female' ? 'השיגה' : 'השיג';

  const shareCaption = isHe
    ? `${rankTitle}\n${roleHe} ${playerName} ${achievedVerb} ${evaluation.overallAccuracy}% דיוק באתגר השווארמה של ShawarmaRadar!\n${dishBreakdown}\nחושבים שאתם שווארמולוגים טובים יותר? בואו לשחק: ${playUrl}`
    : `${rankTitle}\n${playerName} scored ${evaluation.overallAccuracy}% accuracy on ShawarmaRadar's Shawarma Slicing Challenge!\n${dishBreakdown}\nThink you can beat that? Play now: ${playUrl}`;

  const getPngFile = (): File | null => {
    if (!cardBlob) return null;
    const safeName = (playerName.trim() || 'chef').replace(/[^\w\u0590-\u05FF-]+/g, '_');
    return new File([cardBlob], `shawarma-radar-${safeName}-${evaluation.overallAccuracy}.png`, {
      type: 'image/png',
    });
  };

  const canUseNativeFileShare = (file: File | null): boolean => {
    if (!file || typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      return false;
    }
    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  const triggerDownload = (): boolean => {
    if (!cardBlob && !cardPreviewUrl) return false;
    const url = cardBlob ? URL.createObjectURL(cardBlob) : (cardPreviewUrl as string);
    const safeName = (playerName.trim() || 'chef').replace(/[^\w\u0590-\u05FF-]+/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `shawarma-radar-${safeName}-${evaluation.overallAccuracy}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (cardBlob) {
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    return true;
  };

  const copyCaption = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      return true;
    } catch {
      return false;
    }
  };

  const handleStoryShare = async () => {
    void trackUserAction('game_share');
    const file = getPngFile();
    if (file && canUseNativeFileShare(file)) {
      try {
        await navigator.share({
          files: [file],
          title: 'ShawarmaRadar',
          text: shareCaption,
        });
        setStatusMessage(t('share_drawer_shared_ok'));
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    triggerDownload();
    await copyCaption();
    setStatusMessage(t('share_drawer_story_fallback'));
  };

  const handleWhatsAppShare = async () => {
    void trackUserAction('game_share');
    const file = getPngFile();
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile && file && canUseNativeFileShare(file)) {
      try {
        await navigator.share({
          files: [file],
          title: 'ShawarmaRadar',
          text: shareCaption,
        });
        setStatusMessage(t('share_drawer_shared_ok'));
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    triggerDownload();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareCaption)}`, '_blank', 'noopener,noreferrer');
    setStatusMessage(t('share_drawer_whatsapp_fallback'));
  };

  const handleFacebookShare = async () => {
    void trackUserAction('game_share');
    triggerDownload();
    await copyCaption();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playUrl)}&quote=${encodeURIComponent(shareCaption)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
    setStatusMessage(t('share_drawer_facebook_fallback'));
  };

  const handleDownloadClick = () => {
    void trackUserAction('game_share');
    if (triggerDownload()) {
      setStatusMessage(t('share_drawer_downloaded'));
    }
  };

  const handleMoreAppsShare = async () => {
    void trackUserAction('game_share');
    const file = getPngFile();
    if (typeof navigator.share === 'function') {
      try {
        if (file && canUseNativeFileShare(file)) {
          await navigator.share({ files: [file], title: 'ShawarmaRadar', text: shareCaption });
        } else {
          await navigator.share({ title: 'ShawarmaRadar', text: shareCaption, url: playUrl });
        }
        setStatusMessage(t('share_drawer_shared_ok'));
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    handleDownloadClick();
  };

  return (
    <div
      className="share-drawer-backdrop"
      onClick={onClose}
      dir={isHe ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={t('share_drawer_title')}
    >
      <div className="share-drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="share-drawer-handle" />

        <div className="share-drawer-header">
          <div>
            <h3>{t('share_drawer_title')}</h3>
            <p className="share-drawer-sub">{t('share_drawer_subtitle')}</p>
          </div>
          <button
            type="button"
            className="share-drawer-close"
            onClick={onClose}
            aria-label={t('btn_close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="share-drawer-body">
          <div className="share-preview-pane">
            {isGenerating || !cardPreviewUrl ? (
              <div className="share-preview-loading">{t('share_drawer_generating')}</div>
            ) : (
              <img
                src={cardPreviewUrl}
                alt={`${playerName} - ${evaluation.overallAccuracy}%`}
                className="share-preview-img"
              />
            )}
          </div>

          <div className="share-actions-pane">
            <button
              type="button"
              className="share-channel-btn share-btn-story"
              onClick={handleStoryShare}
              disabled={isGenerating}
            >
              <Instagram size={20} />
              <div className="share-channel-text">
                <span className="share-channel-title">{t('share_btn_story')}</span>
                <span className="share-channel-desc">{t('share_btn_story_sub')}</span>
              </div>
            </button>

            <button
              type="button"
              className="share-channel-btn share-btn-whatsapp"
              onClick={handleWhatsAppShare}
              disabled={isGenerating}
            >
              <MessageCircle size={20} />
              <div className="share-channel-text">
                <span className="share-channel-title">{t('share_btn_whatsapp')}</span>
                <span className="share-channel-desc">{t('share_btn_whatsapp_sub')}</span>
              </div>
            </button>

            <button
              type="button"
              className="share-channel-btn share-btn-facebook"
              onClick={handleFacebookShare}
              disabled={isGenerating}
            >
              <Facebook size={20} />
              <div className="share-channel-text">
                <span className="share-channel-title">{t('share_btn_facebook')}</span>
                <span className="share-channel-desc">{t('share_btn_facebook_sub')}</span>
              </div>
            </button>

            <div className="share-secondary-row">
              <button
                type="button"
                className="share-mini-btn"
                onClick={handleDownloadClick}
                disabled={isGenerating || !cardBlob}
              >
                <Download size={16} />
                <span>{t('share_btn_download')}</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  className="share-mini-btn"
                  onClick={handleMoreAppsShare}
                  disabled={isGenerating}
                >
                  <Share2 size={16} />
                  <span>{t('share_btn_more')}</span>
                </button>
              )}
            </div>

            {statusMessage && (
              <div className="share-status-banner">{statusMessage}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDrawer;
