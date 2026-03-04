import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AdBanner.css';

export interface BannerItem {
  /** URL to the banner image */
  imageUrl?: string;
  /** Alt text for the banner image */
  altText: string;
  /** Link URL (e.g. Google Business page) */
  linkUrl: string;
}

interface AdBannerProps {
  /** Array of banners to rotate through */
  banners: BannerItem[];
  /** Rotation interval in milliseconds (default: 5000ms) */
  rotationInterval?: number;
}

const AdBanner: React.FC<AdBannerProps> = ({ banners, rotationInterval = 5000 }) => {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsTransitioning(false);
      }, 400); // fade-out duration
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [banners.length, rotationInterval]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="ad-banner-wrapper" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <a
        href={currentBanner.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`ad-banner-link ${isTransitioning ? 'fade-out' : 'fade-in'}`}
        aria-label={currentBanner.altText}
      >
        {currentBanner.imageUrl ? (
          <img
            src={currentBanner.imageUrl}
            alt={currentBanner.altText}
            className="ad-banner-image"
          />
        ) : (
          <div className="ad-banner-placeholder">
            <span className="ad-banner-placeholder-text">
              {currentBanner.altText}
            </span>
          </div>
        )}
      </a>
      <p className="ad-banner-cta">{t('banner_cta')}</p>
      {banners.length > 1 && (
        <div className="ad-banner-dots">
          {banners.map((_, idx) => (
            <span
              key={idx}
              className={`ad-banner-dot ${idx === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdBanner;
