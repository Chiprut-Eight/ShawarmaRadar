import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LocateFixed, Navigation, Trophy, MapPin, RefreshCw, ArrowUpDown } from 'lucide-react';
import {
  getNearMeRankings,
  getAvailableCities,
  ISRAEL_CITY_COORDINATES,
  type Restaurant
} from '../services/firebase';
import NavigationModal from '../components/NavigationModal';
import './NearMe.css';

const NearMe: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'gps' | 'manual'>('loading');
  const [sortBy, setSortBy] = useState<'national_rank' | 'distance'>('national_rank');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const availableCities = useMemo(() => getAvailableCities(), []);

  const requestGpsLocation = useCallback(() => {
    setLocationStatus('loading');
    setSelectedCity('');
    if (!navigator.geolocation) {
      setGpsCoords(ISRAEL_CITY_COORDINATES['תל אביב']);
      setLocationStatus('manual');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords([pos.coords.latitude, pos.coords.longitude]);
        setLocationStatus('gps');
      },
      () => {
        setGpsCoords((prev) => prev || ISRAEL_CITY_COORDINATES['תל אביב']);
        setLocationStatus('manual');
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  }, []);

  // Run initial GPS lookup ONLY ONCE when entering the screen
  useEffect(() => {
    requestGpsLocation();
  }, [requestGpsLocation]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    if (!city) {
      if (!gpsCoords) {
        requestGpsLocation();
      }
      return;
    }
    setLocationStatus('manual');
  };

  // Reference coordinates: if GPS was acquired, measure real distance from user's GPS;
  // otherwise measure from the selected city's center (or Tel Aviv default)
  const referenceCoords: [number, number] =
    gpsCoords ||
    (selectedCity && ISRAEL_CITY_COORDINATES[selectedCity]) ||
    ISRAEL_CITY_COORDINATES['תל אביב'];

  const { results: nearbyRestaurants } = getNearMeRankings(
    referenceCoords[0],
    referenceCoords[1],
    sortBy,
    selectedCity
  );

  const localKing = nearbyRestaurants.length > 0 ? nearbyRestaurants[0] : null;

  return (
    <div className="nearme-container" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <div className="nearme-header">
        <h2 className="nearme-title">
          <LocateFixed className="nearme-icon" size={26} color="#4ade80" />
          <span>{selectedCity ? `${t('near_me_city_title')} ${selectedCity}` : t('near_me_title')}</span>
        </h2>
        <p className="nearme-subtitle">{t('near_me_subtitle')}</p>

        {/* Controls Bar: City Filter (Mobile & Desktop) + GPS Button + 2 Sort Modes */}
        <div className="nearme-controls">
          <div className="nearme-location-row">
            <button
              type="button"
              className={`gps-refresh-btn ${!selectedCity && locationStatus === 'gps' ? 'active-gps' : ''}`}
              onClick={requestGpsLocation}
            >
              <RefreshCw size={15} className={locationStatus === 'loading' ? 'spin' : ''} />
              <span>
                {!selectedCity && locationStatus === 'gps'
                  ? t('near_me_gps_active')
                  : locationStatus === 'loading'
                  ? t('near_me_locating')
                  : t('near_me_use_gps')}
              </span>
            </button>

            {/* City Filter Dropdown — Active on BOTH Mobile and Desktop */}
            <div className="city-picker-wrap">
              <MapPin size={15} color="#facc15" />
              <select
                value={selectedCity}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="city-picker-select"
              >
                <option value="">{t('near_me_all_cities_gps')}</option>
                {availableCities.map(({ city, count }) => (
                  <option key={city} value={city}>
                    {city} ({count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Toggle: By Closest vs By National Rank */}
          <div className="nearme-filters-row">
            <div className="sort-label">
              <ArrowUpDown size={14} />
              <span>{t('near_me_sort_label')}</span>
            </div>
            <div className="radius-pills">
              <button
                type="button"
                className={`radius-pill ${sortBy === 'distance' ? 'active' : ''}`}
                onClick={() => setSortBy('distance')}
              >
                📍 {t('near_me_sort_closest')}
              </button>
              <button
                type="button"
                className={`radius-pill ${sortBy === 'national_rank' ? 'active' : ''}`}
                onClick={() => setSortBy('national_rank')}
              >
                🏆 {t('near_me_sort_national_rank')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* #1 Shawarma Display */}
      <div className="king-radar-container">
        <h3 className="king-radar-title">
          {sortBy === 'distance' ? t('near_me_closest_king_title') : t('near_me_king_title')}
        </h3>

        {localKing ? (
          <div
            className="radar-display clickable-radar"
            onClick={() => setSelectedRestaurant(localKing)}
            title={t('click_to_navigate')}
          >
            <div className="radar-sweep"></div>

            <div className="nearme-king-badges" style={{ zIndex: 2 }}>
              {localKing.national_rank && (
                <span className="national-rank-pill">
                  <Trophy size={13} />
                  {t('national_table_place', { rank: localKing.national_rank })}
                </span>
              )}
              {typeof localKing.distance_km === 'number' && (
                <span className="distance-pill">
                  📍 {localKing.distance_km.toFixed(1)} {t('km_away')}
                </span>
              )}
            </div>

            <div className="king-radar-name">{localKing.name}</div>
            <div className="king-radar-address">
              {localKing.city}
              {localKing.address && localKing.address !== localKing.city
                ? ` • ${localKing.address}`
                : ''}
            </div>
            <div className="king-radar-score">{localKing.bayesian_average.toFixed(1)}%</div>

            <div className="radar-nav-cta" style={{ zIndex: 2 }}>
              <Navigation size={14} />
              <span>{t('click_to_navigate')}</span>
            </div>
          </div>
        ) : (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>{t('no_data')}</div>
          </div>
        )}
      </div>

      {/* Top 2 - 10 List */}
      <div className="signals-panel" style={{ marginTop: '20px' }}>
        <h2 className="signals-section-title">{t('near_me_list_title')}</h2>

        {nearbyRestaurants.slice(1).map((place, idx) => (
          <div
            className="signal-card clickable-card"
            key={place.id}
            onClick={() => setSelectedRestaurant(place)}
          >
            <div className="signal-icon-box">#{idx + 2}</div>

            <div className="signal-content">
              <div className="signal-title-row">
                <h3>{place.name}</h3>
              </div>
              <p className="signal-sub">
                {place.city}{' '}
                {place.address && place.address !== place.city ? `• ${place.address}` : ''}
              </p>
              <div className="signal-meta-badges">
                {place.national_rank && (
                  <span className="national-rank-tag">
                    🏆 #{place.national_rank} {t('in_israel_short')}
                  </span>
                )}
                {typeof place.distance_km === 'number' && (
                  <span className="distance-tag">
                    📍 {place.distance_km.toFixed(1)} {t('km_short')}
                  </span>
                )}
              </div>
            </div>

            <div className="signal-end-col">
              <div className="signal-score">{place.bayesian_average.toFixed(1)}%</div>
              <span className="nav-chip">
                <Navigation size={12} />
                <span>{t('navigate_btn')}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <NavigationModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />
    </div>
  );
};

export default NearMe;
