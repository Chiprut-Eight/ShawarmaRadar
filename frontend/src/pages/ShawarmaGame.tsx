import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Flame,
  Lock,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Flag,
} from 'lucide-react';
import {
  DISH_CONFIGS,
  DISH_MAP,
  ROUND_DURATION_SEC,
  createEmptyWeights,
  evaluateRound,
  getPersonalBest,
  getRoleLabelHe,
  getSavedPlayerGender,
  getSavedPlayerName,
  savePersonalBestIfHigher,
  savePlayerGender,
  savePlayerName,
  type DishId,
  type GamePhase,
  type PlayerGender,
  type RoundEvaluation,
} from '../game/shawarmaGameConfig';
import { ShawarmaSoundEngine } from '../game/soundEffects';
import PortionIcon from '../components/game/PortionIcon';
import ShawarmaSpitCanvas from '../components/game/ShawarmaSpitCanvas';
import ShareDrawer from '../components/game/ShareDrawer';
import { generateResultShareCard } from '../utils/shareCardGenerator';
import { trackUserAction } from '../services/analytics';
import './ShawarmaGame.css';

interface DishLiveStatus {
  hasMeat: boolean;
  overflowing: boolean;
}

function createInitialStatus(): Record<DishId, DishLiveStatus> {
  return {
    laffa: { hasMeat: false, overflowing: false },
    pita: { hasMeat: false, overflowing: false },
    half: { hasMeat: false, overflowing: false },
  };
}

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, idx) => ({
  id: idx,
  left: `${(idx * 37 + 7) % 96}%`,
  delay: `${(idx % 7) * 0.18}s`,
  duration: `${2.2 + (idx % 5) * 0.35}s`,
  color: idx % 3 === 0 ? '#facc15' : idx % 3 === 1 ? '#4ade80' : '#fb923c',
}));

const ShawarmaGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const langKey: 'he' | 'en' = isHe ? 'he' : 'en';

  const [phase, setPhase] = useState<GamePhase>('intro');
  const [playerName, setPlayerName] = useState<string>(() => getSavedPlayerName());
  const [gender, setGender] = useState<PlayerGender | null>(() => getSavedPlayerGender());
  const [nameError, setNameError] = useState<boolean>(false);
  const [genderError, setGenderError] = useState<boolean>(false);
  const [personalBest, setPersonalBest] = useState<number | null>(() => getPersonalBest());
  const [isNewBest, setIsNewBest] = useState<boolean>(false);

  const [roundId, setRoundId] = useState<number>(0);
  const [activeDish, setActiveDish] = useState<DishId>('laffa');
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_DURATION_SEC);
  const [isSlicingVisual, setIsSlicingVisual] = useState<boolean>(false);
  const [forceSlicing, setForceSlicing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dishStatus, setDishStatus] = useState<Record<DishId, DishLiveStatus>>(createInitialStatus);

  const [evaluation, setEvaluation] = useState<RoundEvaluation | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const dishWeightsRef = useRef<Record<DishId, number>>(createEmptyWeights());
  const soundRef = useRef<ShawarmaSoundEngine | null>(null);
  const roundFinishedRef = useRef<boolean>(false);
  const deadlineRef = useRef<number>(0);

  useEffect(() => {
    const engine = new ShawarmaSoundEngine();
    soundRef.current = engine;
    return () => {
      engine.dispose();
      soundRef.current = null;
    };
  }, []);

  const resolvedGender: PlayerGender = gender ?? 'male';

  const finishRound = useCallback(() => {
    if (roundFinishedRef.current) return;
    roundFinishedRef.current = true;

    setForceSlicing(false);
    setIsSlicingVisual(false);

    const roundEval = evaluateRound(dishWeightsRef.current, resolvedGender);
    soundRef.current?.playFinish(roundEval.overallAccuracy);

    const beatBest = savePersonalBestIfHigher(roundEval.overallAccuracy);
    setIsNewBest(beatBest);
    setPersonalBest(getPersonalBest());

    setEvaluation(roundEval);
    setPhase('results');
    void trackUserAction('game_complete');
  }, [resolvedGender]);

  const finishRoundRef = useRef(finishRound);
  useEffect(() => {
    finishRoundRef.current = finishRound;
  }, [finishRound]);

  // Countdown timer loop during 'playing'
  useEffect(() => {
    if (phase !== 'playing') return;

    deadlineRef.current = Date.now() + ROUND_DURATION_SEC * 1000;
    let lastShownSec = ROUND_DURATION_SEC;

    const timerId = window.setInterval(() => {
      const remainingMs = deadlineRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec !== lastShownSec) {
        lastShownSec = remainingSec;
        setTimeLeft(remainingSec);
        if (remainingSec > 0 && remainingSec <= 5) {
          soundRef.current?.playTick(remainingSec <= 3);
        }
      }

      if (remainingMs <= 0) {
        window.clearInterval(timerId);
        finishRoundRef.current();
      }
    }, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, [phase, roundId]);

  // Generate HD PNG share card whenever results arrive or language switches on results screen
  useEffect(() => {
    if (phase !== 'results' || !evaluation) return;
    let cancelled = false;

    const buildCard = async () => {
      setIsGeneratingCard(true);
      try {
        const result = await generateResultShareCard({
          playerName,
          gender: resolvedGender,
          evaluation,
          lang: langKey,
          siteHost: window.location.host || 'shawarmaradar.web.app',
        });
        if (!cancelled) {
          setCardBlob(result.blob);
          setCardPreviewUrl(result.dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate share card:', err);
      } finally {
        if (!cancelled) {
          setIsGeneratingCard(false);
        }
      }
    };

    void buildCard();
    return () => {
      cancelled = true;
    };
  }, [phase, evaluation, playerName, resolvedGender, langKey]);

  // Always start every game screen/phase cleanly from the top of the page
  useEffect(() => {
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollTop();
    const rafId = window.requestAnimationFrame(scrollTop);
    const timerId = window.setTimeout(scrollTop, 60);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
    };
  }, [phase, roundId]);

  const startRound = useCallback(
    (chosenName: string, chosenGender: PlayerGender | null) => {
      const clean = chosenName.trim();
      const missingName = !clean;
      const missingGender = !chosenGender;
      setNameError(missingName);
      setGenderError(missingGender);
      if (missingName || missingGender) {
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      savePlayerName(clean);
      savePlayerGender(chosenGender);
      setPlayerName(clean);
      setGender(chosenGender);

      soundRef.current?.unlock();
      roundFinishedRef.current = false;
      dishWeightsRef.current = createEmptyWeights();
      setDishStatus(createInitialStatus());
      setActiveDish('laffa');
      setTimeLeft(ROUND_DURATION_SEC);
      setForceSlicing(false);
      setIsSlicingVisual(false);
      setEvaluation(null);
      setCardBlob(null);
      setCardPreviewUrl(null);
      setIsShareOpen(false);
      setRoundId((prev) => prev + 1);
      setPhase('playing');
      void trackUserAction('game_start');
    },
    []
  );

  const handleIntroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startRound(playerName, gender);
  };

  const handleSelectDish = (dishId: DishId) => {
    if (dishId === activeDish) return;
    setForceSlicing(false);
    setActiveDish(dishId);
    soundRef.current?.playSwitchDish();
  };

  const handleSliceStateChange = useCallback((slicing: boolean) => {
    setIsSlicingVisual(slicing);
    soundRef.current?.setSlicing(slicing);
  }, []);

  const handleDishStatusChange = useCallback(
    (dishId: DishId, hasMeat: boolean, overflowing: boolean) => {
      setDishStatus((prev) => {
        const current = prev[dishId];
        if (current.hasMeat === hasMeat && current.overflowing === overflowing) {
          return prev;
        }
        return {
          ...prev,
          [dishId]: { hasMeat, overflowing },
        };
      });
    },
    []
  );

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundRef.current?.setMuted(next);
    if (!next) {
      soundRef.current?.unlock();
    }
  };

  const nextUnfilledDish = useMemo<DishId | null>(() => {
    const idx = DISH_CONFIGS.findIndex((c) => c.id === activeDish);
    for (let step = 1; step <= DISH_CONFIGS.length; step++) {
      const candidate = DISH_CONFIGS[(idx + step) % DISH_CONFIGS.length];
      if (!dishStatus[candidate.id].hasMeat) {
        return candidate.id;
      }
    }
    return null;
  }, [activeDish, dishStatus]);

  const anyDishHasMeat =
    dishStatus.laffa.hasMeat || dishStatus.pita.hasMeat || dishStatus.half.hasMeat;
  const allDishesHaveMeat =
    dishStatus.laffa.hasMeat && dishStatus.pita.hasMeat && dishStatus.half.hasMeat;

  const activeDishConfig = DISH_MAP[activeDish];
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / ROUND_DURATION_SEC) * 100));
  const timerStateClass = timeLeft <= 5 ? 'critical' : timeLeft <= 10 ? 'warning' : '';

  return (
    <div className="shawarma-game-page" dir={isHe ? 'rtl' : 'ltr'}>
      {/* ======================== PHASE 1: INTRO ======================== */}
      {phase === 'intro' && (
        <section className="game-card game-intro-card">
          <div className="game-badge-pill">
            <Flame size={15} />
            <span>{t('game_badge')}</span>
          </div>

          <h1 className="game-title">{t('game_page_title')}</h1>
          <p className="game-subtitle">{t('game_intro_subtitle')}</p>

          {personalBest !== null && (
            <div className="game-best-pill">
              <Trophy size={15} />
              <span>{t('game_personal_best', { score: personalBest })}</span>
            </div>
          )}

          <div className="intro-dishes-row">
            {DISH_CONFIGS.map((dish) => (
              <div key={dish.id} className="intro-dish-preview">
                <PortionIcon type={dish.id} size={74} fillRatio={0.8} />
                <div className="intro-dish-name">{isHe ? dish.labelHe : dish.labelEn}</div>
                <div className="intro-dish-target">
                  {t('game_grams_value', { grams: dish.targetGrams })}
                </div>
              </div>
            ))}
          </div>

          <div className="intro-rules-strip">
            <span>🔪 {t('game_rule_knife')}</span>
            <span>🔒 {t('game_rule_blind')}</span>
            <span>⏱️ {t('game_rule_timer', { seconds: ROUND_DURATION_SEC })}</span>
          </div>

          <form className="intro-name-form" onSubmit={handleIntroSubmit} noValidate>
            <label htmlFor="player-name-input" className="intro-name-label">
              <User size={16} />
              <span>{t('game_name_label')}</span>
            </label>
            <input
              id="player-name-input"
              type="text"
              maxLength={24}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(false);
              }}
              placeholder={t('game_name_placeholder')}
              className={`intro-name-input ${nameError ? 'has-error' : ''}`}
              autoComplete="name"
            />
            {nameError && <p className="intro-error-text">{t('game_name_required')}</p>}

            <div className="intro-gender-block">
              <span className="intro-gender-label">{t('game_gender_label')}</span>
              <div
                className={`intro-gender-options ${genderError ? 'has-error' : ''}`}
                role="radiogroup"
                aria-label={t('game_gender_label')}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={gender === 'male'}
                  className={`gender-option-btn ${gender === 'male' ? 'selected' : ''}`}
                  onClick={() => {
                    setGender('male');
                    setGenderError(false);
                  }}
                >
                  <span className="gender-option-title">{t('game_gender_male')}</span>
                  <span className="gender-option-role">{t('game_gender_male_role')}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={gender === 'female'}
                  className={`gender-option-btn ${gender === 'female' ? 'selected' : ''}`}
                  onClick={() => {
                    setGender('female');
                    setGenderError(false);
                  }}
                >
                  <span className="gender-option-title">{t('game_gender_female')}</span>
                  <span className="gender-option-role">{t('game_gender_female_role')}</span>
                </button>
              </div>
              {genderError && <p className="intro-error-text">{t('game_gender_required')}</p>}
            </div>

            <button type="submit" className="game-primary-btn intro-submit-btn">
              <Play size={18} />
              <span>{t('game_start_btn')}</span>
            </button>

            <button
              type="button"
              className={`intro-sound-btn ${isMuted ? 'is-muted' : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{isMuted ? t('game_unmute_sound_btn') : t('game_mute_sound_btn')}</span>
            </button>
          </form>
        </section>
      )}

      {/* ======================== PHASE 2: PLAYING ======================== */}
      {phase === 'playing' && (
        <section className="game-card game-play-card">
          {/* Top HUD */}
          <div className="play-hud">
            <div className="hud-player-pill">
              <User size={15} />
              <span>{playerName}</span>
            </div>

            <div className={`hud-timer-box ${timerStateClass}`}>
              <Clock size={16} />
              <span className="hud-timer-digits">
                00:{String(timeLeft).padStart(2, '0')}
              </span>
              <div className="hud-timer-bar-track">
                <div
                  className="hud-timer-bar-fill"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              className="hud-sound-btn"
              onClick={toggleMute}
              aria-label={isMuted ? t('game_sound_on') : t('game_sound_off')}
              title={isMuted ? t('game_sound_on') : t('game_sound_off')}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          {/* Active Dish Blind Target Banner */}
          <div className="active-dish-banner">
            <div className="active-dish-meta">
              <span className="active-dish-kicker">{t('game_now_prepping')}</span>
              <strong className="active-dish-name">
                {isHe ? activeDishConfig.labelHe : activeDishConfig.labelEn}
              </strong>
            </div>
            <div className="active-dish-chips">
              <span className="target-gram-chip">
                {t('game_target_label', { grams: activeDishConfig.targetGrams })}
              </span>
              <span className="blind-weight-chip">
                <Lock size={13} />
                <span>{t('game_weight_hidden')}</span>
              </span>
            </div>
          </div>

          {/* Interactive Spit + Side 3 Portion Icons */}
          <div className="game-arena-grid">
            <div className="spit-stage-col">
              <ShawarmaSpitCanvas
                key={roundId}
                activeDish={activeDish}
                isPlaying={phase === 'playing'}
                forceSlicing={forceSlicing}
                dishWeightsRef={dishWeightsRef}
                targetLabel={t('game_target_label', { grams: activeDishConfig.targetGrams })}
                hiddenWeightLabel={t('game_weight_hidden_short')}
                dragHintLabel={t('game_drag_hint')}
                onSliceStateChange={handleSliceStateChange}
                onDishStatusChange={handleDishStatusChange}
              />

              <button
                type="button"
                className={`hold-slice-btn ${isSlicingVisual ? 'slicing' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundRef.current?.unlock();
                  setForceSlicing(true);
                }}
                onPointerUp={() => setForceSlicing(false)}
                onPointerCancel={() => setForceSlicing(false)}
                onPointerLeave={() => setForceSlicing(false)}
                onKeyDown={(e) => {
                  if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    soundRef.current?.unlock();
                    setForceSlicing(true);
                  }
                }}
                onKeyUp={() => setForceSlicing(false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <Zap size={18} />
                <span>
                  {dishStatus[activeDish].overflowing
                    ? t('game_dish_full')
                    : isSlicingVisual
                    ? resolvedGender === 'female'
                      ? t('game_slicing_active_f')
                      : t('game_slicing_active_m')
                    : t('game_hold_to_slice')}
                </span>
              </button>
            </div>

            {/* Side Portion Selector Rail (Laffa 280g, Pita 180g, Half 80g) */}
            <aside className="portion-rail" aria-label={t('game_choose_portion')}>
              {DISH_CONFIGS.map((dish) => {
                const isSelected = dish.id === activeDish;
                const status = dishStatus[dish.id];
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => handleSelectDish(dish.id)}
                    className={`portion-side-card ${isSelected ? 'active' : ''} ${
                      status.hasMeat ? 'filled' : ''
                    }`}
                  >
                    <div className="portion-side-icon">
                      <PortionIcon
                        type={dish.id}
                        size={56}
                        showMeatInside={status.hasMeat}
                        fillRatio={status.overflowing ? 1 : status.hasMeat ? 0.78 : 0.25}
                      />
                    </div>
                    <div className="portion-side-info">
                      <span className="portion-side-title">
                        {isHe ? dish.labelHe : dish.labelEn}
                      </span>
                      <span className="portion-side-target">
                        {t('game_grams_value', { grams: dish.targetGrams })}
                      </span>
                      <span className="portion-side-status">
                        {status.overflowing ? (
                          <span className="status-warn">{t('game_status_full')}</span>
                        ) : status.hasMeat ? (
                          <span className="status-done">
                            <CheckCircle2 size={12} /> {t('game_status_sliced')}
                          </span>
                        ) : isSelected ? (
                          <span className="status-now">{t('game_status_prepping')}</span>
                        ) : (
                          <span className="status-wait">{t('game_status_waiting')}</span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>
          </div>

          {/* Bottom Controls */}
          <div className="play-bottom-actions">
            {nextUnfilledDish && (
              <button
                type="button"
                className="game-secondary-btn"
                onClick={() => handleSelectDish(nextUnfilledDish)}
              >
                <span>
                  {t('game_next_dish_btn', {
                    dish: isHe
                      ? DISH_MAP[nextUnfilledDish].labelHe
                      : DISH_MAP[nextUnfilledDish].labelEn,
                  })}
                </span>
                {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </button>
            )}

            <button
              type="button"
              className={`game-finish-btn ${allDishesHaveMeat ? 'ready-all' : ''}`}
              disabled={!anyDishHasMeat}
              onClick={finishRound}
            >
              <Flag size={18} />
              <span>{t('game_finish_btn')}</span>
            </button>
          </div>
        </section>
      )}

      {/* ======================== PHASE 3: RESULTS ======================== */}
      {phase === 'results' && evaluation && (
        <section className="game-card game-results-card">
          {evaluation.rank.celebrate && (
            <div className="results-confetti-layer" aria-hidden="true">
              {CONFETTI_PIECES.map((piece) => (
                <span
                  key={piece.id}
                  className="confetti-dot"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    backgroundColor: piece.color,
                  }}
                />
              ))}
            </div>
          )}

          <div className="results-hero">
            <div className="results-player-row">
              <span className="results-player-chip">
                <User size={14} />{' '}
                {isHe ? `${getRoleLabelHe(resolvedGender)}: ${playerName}` : playerName}
              </span>
              {isNewBest && (
                <span className="results-new-best-chip">
                  <Sparkles size={14} /> {t('game_new_record')}
                </span>
              )}
            </div>

            <h1 className="results-rank-title">
              {isHe ? evaluation.rank.titleHe : evaluation.rank.titleEn}
            </h1>
            <p className="results-rank-subtitle">
              {isHe ? evaluation.rank.subtitleHe : evaluation.rank.subtitleEn}
            </p>

            {/* Circular Overall Accuracy Ring */}
            <div className="results-score-ring-wrap">
              <svg className="results-score-ring" viewBox="0 0 120 120">
                <circle className="ring-track" cx="60" cy="60" r="50" />
                <circle
                  className="ring-progress"
                  cx="60"
                  cy="60"
                  r="50"
                  style={{
                    stroke: evaluation.rank.accentColor,
                    strokeDashoffset: `${314.16 * (1 - evaluation.overallAccuracy / 100)}`,
                  }}
                />
              </svg>
              <div className="results-score-center">
                <span className="results-score-num">{evaluation.overallAccuracy}%</span>
                <span className="results-score-label">{t('game_overall_accuracy')}</span>
              </div>
            </div>
          </div>

          {/* 3 Revealed Portion Result Cards */}
          <div className="results-dishes-grid">
            {evaluation.dishes.map((dish) => {
              const diffText =
                dish.grade === 'bullseye'
                  ? t('game_diff_bullseye')
                  : dish.diffGrams > 0
                  ? t('game_diff_over', { grams: dish.diffGrams })
                  : t('game_diff_under', { grams: Math.abs(dish.diffGrams) });

              return (
                <div key={dish.dishId} className={`result-dish-card grade-${dish.grade}`}>
                  <div className="result-dish-visual">
                    <PortionIcon
                      type={dish.dishId}
                      size={76}
                      showMeatInside={dish.actualGrams > 0}
                      fillRatio={Math.min(1, dish.actualGrams / dish.maxCapGrams)}
                    />
                  </div>

                  <div className="result-dish-details">
                    <div className="result-dish-top">
                      <h3>{isHe ? dish.labelHe : dish.labelEn}</h3>
                      <span className={`result-accuracy-badge grade-${dish.grade}`}>
                        {dish.accuracy}%
                      </span>
                    </div>

                    <div className="result-weights-row">
                      <span>
                        {t('game_actual_grams', { grams: dish.actualGrams })}
                      </span>
                      <span className="result-target-muted">
                        {t('game_target_label', { grams: dish.targetGrams })}
                      </span>
                    </div>

                    <div className={`result-diff-line grade-${dish.grade}`}>{diffText}</div>

                    <div className="result-bar-track">
                      <div
                        className={`result-bar-fill grade-${dish.grade}`}
                        style={{ width: `${Math.max(4, dish.accuracy)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary Actions: Share Image Drawer + Play Again */}
          <div className="results-cta-row">
            <button
              type="button"
              className="game-primary-btn results-share-btn"
              onClick={() => setIsShareOpen(true)}
            >
              <Share2 size={19} />
              <span>{t('game_share_results_btn')}</span>
            </button>

            <button
              type="button"
              className="game-secondary-btn results-replay-btn"
              onClick={() => startRound(playerName, resolvedGender)}
            >
              <RotateCcw size={18} />
              <span>{t('game_play_again_btn')}</span>
            </button>

            <button
              type="button"
              className="game-ghost-btn"
              onClick={() => {
                setIsShareOpen(false);
                setPhase('intro');
              }}
            >
              <User size={16} />
              <span>{t('game_change_name_btn')}</span>
            </button>
          </div>

          <ShareDrawer
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            playerName={playerName}
            gender={resolvedGender}
            evaluation={evaluation}
            cardBlob={cardBlob}
            cardPreviewUrl={cardPreviewUrl}
            isGenerating={isGeneratingCard}
          />
        </section>
      )}
    </div>
  );
};

export default ShawarmaGame;
