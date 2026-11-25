import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, MapPin, Trophy, X, ExternalLink, Ticket } from 'lucide-react';
import type { Restaurant } from '../services/firebase';
import './NavigationModal.css';

interface NavigationModalProps {
  restaurant: Restaurant | null;
  onClose: () => void;
}

/**
 * Active navigation coupon campaigns for main-page advertisers.
 * Match by business name substring (e.g., "בון טעם") or exact restaurant ID.
 */
interface CouponCampaign {
  matchName: string;
  couponTextHe: string;
  couponTextEn: string;
}

const ACTIVE_NAVIGATION_COUPONS: CouponCampaign[] = [
  // Example for main-page banner advertiser (uncomment or add businesses with active coupon add-on):
  // {
  //   matchName: 'שווארמה בון טעם',
  //   couponTextHe: 'הציגו מסך זה בקופה וקבלו פחית שתייה מתנה ברכישת מנה!',
  //   couponTextEn: 'Show this screen at the register for a free drink with your meal!'
  // }
];

const NavigationModal: React.FC<NavigationModalProps> = ({ restaurant, onClose }) => {
  const { t, i18n } = useTranslation();

  if (!restaurant) return null;

  const matchedCoupon = ACTIVE_NAVIGATION_COUPONS.find((c) =>
    restaurant.name.includes(c.matchName)
  );

  const fullLocationText =
    restaurant.address && restaurant.address !== restaurant.city
      ? `${restaurant.address}, ${restaurant.city}`
      : restaurant.city;

  const searchAddressQuery = `${restaurant.name} ${restaurant.address || ''} ${restaurant.city}`.trim();
  const wazeAddressQuery =
    restaurant.address && restaurant.address !== restaurant.city
      ? `${restaurant.address}, ${restaurant.city}`
      : `${restaurant.name}, ${restaurant.city}`;

  // Official Universal Links that launch native Waze / Google Maps apps on iOS & Android
  // and open gracefully in the browser on Windows / Mac Desktop
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(wazeAddressQuery)}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchAddressQuery)}`;

  return (
    <div className="nav-modal-overlay" onClick={onClose}>
      <div
        className="nav-modal-card"
        onClick={(e) => e.stopPropagation()}
        dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
      >
        <button className="nav-modal-close" onClick={onClose} aria-label={t('btn_close')}>
          <X size={20} />
        </button>

        <div className="nav-modal-header">
          <div className="nav-modal-badges">
            {restaurant.national_rank && (
              <span className="nav-badge-rank">
                <Trophy size={14} />
                {t('national_table_place', { rank: restaurant.national_rank })}
              </span>
            )}
            <span className="nav-badge-score">{restaurant.bayesian_average.toFixed(1)}%</span>
            {typeof restaurant.distance_km === 'number' && (
              <span className="nav-badge-distance">
                📍 {restaurant.distance_km.toFixed(1)} {t('km_away')}
              </span>
            )}
          </div>

          <h3 className="nav-modal-title">{restaurant.name}</h3>
          <p className="nav-modal-address">
            <MapPin size={16} />
            <span>{fullLocationText}</span>
          </p>
        </div>

        <p className="nav-modal-prompt">{t('nav_choose_app')}</p>

        <div className="nav-modal-actions">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-app-btn waze-btn"
            onClick={onClose}
          >
            <div className="nav-app-icon">🚗</div>
            <div className="nav-app-info">
              <span className="nav-app-name">Waze</span>
              <span className="nav-app-desc">{t('nav_waze_sub')}</span>
            </div>
            <ExternalLink size={18} className="nav-app-arrow" />
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-app-btn gmaps-btn"
            onClick={onClose}
          >
            <div className="nav-app-icon">🗺️</div>
            <div className="nav-app-info">
              <span className="nav-app-name">Google Maps</span>
              <span className="nav-app-desc">{t('nav_gmaps_sub')}</span>
            </div>
            <ExternalLink size={18} className="nav-app-arrow" />
          </a>
        </div>

        {/* Navigation Coupon Slot */}
        {matchedCoupon ? (
          <div className="nav-coupon-box nav-coupon-active">
            <div className="nav-coupon-header">
              <Ticket size={16} />
              <span>{t('nav_coupon_badge')}</span>
            </div>
            <p className="nav-coupon-text">
              {i18n.language === 'he' ? matchedCoupon.couponTextHe : matchedCoupon.couponTextEn}
            </p>
          </div>
        ) : (
          <a
            href={`https://wa.me/972523445081?text=${encodeURIComponent(t('whatsapp_ad_prefill'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-coupon-box nav-coupon-placeholder"
          >
            <Ticket size={15} className="nav-coupon-icon" />
            <span>{t('nav_coupon_demo_text')}</span>
          </a>
        )}

        <div className="nav-modal-footer">
          <Navigation size={13} />
          <span>{t('nav_universal_note')}</span>
        </div>
      </div>
    </div>
  );
};

export default NavigationModal;
