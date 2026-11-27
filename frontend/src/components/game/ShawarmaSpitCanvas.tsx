import React, { useEffect, useRef } from 'react';
import { DISH_MAP, SLICE_RATE_GPS, type DishId } from '../../game/shawarmaGameConfig';

interface ShawarmaSpitCanvasProps {
  activeDish: DishId;
  isPlaying: boolean;
  forceSlicing: boolean;
  dishWeightsRef: React.MutableRefObject<Record<DishId, number>>;
  targetLabel: string;
  hiddenWeightLabel: string;
  dragHintLabel: string;
  onSliceStateChange: (slicing: boolean) => void;
  onDishStatusChange: (dishId: DishId, hasMeat: boolean, isOverflowing: boolean) => void;
}

interface FallingShaving {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  len: number;
  thick: number;
  tone: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface PileStrip {
  nx: number; // normalized offset -1..1
  ny: number; // normalized pile height 0..1
  rot: number;
  len: number;
  tone: number;
}

function buildPilePool(count: number): PileStrip[] {
  const strips: PileStrip[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random distribution so pile builds smoothly without flicker
    const s1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
    const s2 = Math.sin(i * 78.233 + 4.56) * 19341.2134;
    const s3 = Math.sin(i * 39.425 + 7.89) * 29431.7123;
    const r1 = s1 - Math.floor(s1);
    const r2 = s2 - Math.floor(s2);
    const r3 = s3 - Math.floor(s3);
    const layer = i / count;
    const spread = 1 - layer * 0.45;
    strips.push({
      nx: (r1 * 2 - 1) * spread,
      ny: layer * 0.85 + r2 * 0.15,
      rot: (r3 - 0.5) * 1.4,
      len: 12 + r2 * 10,
      tone: r1,
    });
  }
  return strips;
}

const PILE_POOL = buildPilePool(90);

const ShawarmaSpitCanvas: React.FC<ShawarmaSpitCanvasProps> = ({
  activeDish,
  isPlaying,
  forceSlicing,
  dishWeightsRef,
  targetLabel,
  hiddenWeightLabel,
  dragHintLabel,
  onSliceStateChange,
  onDishStatusChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef({
    activeDish,
    isPlaying,
    forceSlicing,
    targetLabel,
    hiddenWeightLabel,
    dragHintLabel,
    onSliceStateChange,
    onDishStatusChange,
  });

  useEffect(() => {
    propsRef.current = {
      activeDish,
      isPlaying,
      forceSlicing,
      targetLabel,
      hiddenWeightLabel,
      dragHintLabel,
      onSliceStateChange,
      onDishStatusChange,
    };
  }, [
    activeDish,
    isPlaying,
    forceSlicing,
    targetLabel,
    hiddenWeightLabel,
    dragHintLabel,
    onSliceStateChange,
    onDishStatusChange,
  ]);

  const simRef = useRef({
    spitAngle: 0,
    bladeAngle: 0,
    autoSweepPhase: 0,
    shaveAccum: 0,
    sparkAccum: 0,
    heatTime: 0,
    pointerActive: false,
    pointerHasMoved: false,
    pointerDownX: 0,
    pointerDownY: 0,
    knifeTargetYRatio: 0.42,
    knifeCurrentYRatio: 0.42,
    knifeEngage: 0, // 0 idle -> 1 pressing into spit
    wasSlicing: false,
    shavings: [] as FallingShaving[],
    sparks: [] as Spark[],
    reportedStatus: {
      laffa: { hasMeat: false, overflowing: false },
      pita: { hasMeat: false, overflowing: false },
      half: { hasMeat: false, overflowing: false },
    } as Record<DishId, { hasMeat: boolean; overflowing: boolean }>,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const simNode = simRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || 340;
    let height = container.clientHeight || 420;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = Math.max(220, container.clientWidth);
      height = Math.max(280, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const drawMeatSpit = (
      spitX: number,
      spitTop: number,
      spitBottom: number,
      maxRadius: number,
      minRadius: number,
      angle: number,
      knifeY: number,
      slicingIntensity: number
    ) => {
      const spitH = spitBottom - spitTop;

      // Vertical steel skewer pole
      const poleGrad = ctx.createLinearGradient(spitX - 6, 0, spitX + 6, 0);
      poleGrad.addColorStop(0, '#52525b');
      poleGrad.addColorStop(0.45, '#e4e4e7');
      poleGrad.addColorStop(1, '#3f3f46');
      ctx.fillStyle = poleGrad;
      ctx.fillRect(spitX - 4.5, spitTop - 32, 9, spitH + 58);

      // Bottom drip plate
      ctx.save();
      const plateY = spitBottom + 10;
      const plateGrad = ctx.createLinearGradient(spitX - maxRadius * 1.15, plateY, spitX + maxRadius * 1.15, plateY);
      plateGrad.addColorStop(0, '#3f3f46');
      plateGrad.addColorStop(0.5, '#a1a1aa');
      plateGrad.addColorStop(1, '#27272a');
      ctx.fillStyle = plateGrad;
      ctx.beginPath();
      ctx.ellipse(spitX, plateY, maxRadius * 1.08, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Stacked tapered shawarma cone slices
      const layers = 20;
      const layerH = spitH / layers;
      for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const y = spitTop + i * layerH;
        const bulge = Math.sin(t * Math.PI) * 7;
        const wobble = Math.sin(i * 1.7 + angle * 0.8) * 1.8;
        const r = minRadius + (maxRadius - minRadius) * (1 - t * 0.72) + bulge + wobble;

        // Cylindrical horizontal body gradient
        const bodyGrad = ctx.createLinearGradient(spitX - r, y, spitX + r, y);
        bodyGrad.addColorStop(0, '#3d1909');
        bodyGrad.addColorStop(0.28, '#7c3415');
        bodyGrad.addColorStop(0.58, '#a64d21');
        bodyGrad.addColorStop(0.84, '#6b2c11');
        bodyGrad.addColorStop(1, '#321407');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(spitX, y + layerH * 0.5, r, Math.max(7, layerH * 0.72), 0, 0, Math.PI * 2);
        ctx.fill();

        // Rotating seared fat & spice marbling streaks on front face
        for (let b = 0; b < 3; b++) {
          const theta = angle + i * 0.55 + (b * Math.PI * 2) / 3;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          if (cosT > -0.1) {
            const bandX = spitX + sinT * r * 0.82;
            const bandW = Math.max(2, cosT * 10);
            ctx.fillStyle =
              b % 2 === 0
                ? `rgba(245, 178, 92, ${0.14 + cosT * 0.22})`
                : `rgba(38, 14, 5, ${0.22 + cosT * 0.28})`;
            ctx.beginPath();
            ctx.ellipse(bandX, y + layerH * 0.5, bandW, layerH * 0.42, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Active freshly-carved glowing meat notch near knife contact
      if (slicingIntensity > 0.1) {
        const t = Math.max(0, Math.min(1, (knifeY - spitTop) / spitH));
        const rAtKnife = minRadius + (maxRadius - minRadius) * (1 - t * 0.72) + Math.sin(t * Math.PI) * 7;
        const notchX = spitX + rAtKnife * 0.82;
        ctx.save();
        const freshGrad = ctx.createRadialGradient(notchX, knifeY, 2, notchX, knifeY, 18);
        freshGrad.addColorStop(0, `rgba(255, 196, 112, ${0.65 * slicingIntensity})`);
        freshGrad.addColorStop(1, 'rgba(180, 75, 25, 0)');
        ctx.fillStyle = freshGrad;
        ctx.beginPath();
        ctx.arc(notchX, knifeY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Top brass/gold meat cap + onion/tomato skewer garnish look
      const topR = maxRadius * 0.92;
      const capGrad = ctx.createLinearGradient(spitX - topR * 0.45, spitTop - 16, spitX + topR * 0.45, spitTop);
      capGrad.addColorStop(0, '#b45309');
      capGrad.addColorStop(0.5, '#fde047');
      capGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.ellipse(spitX, spitTop - 5, topR * 0.42, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e4e4e7';
      ctx.beginPath();
      ctx.arc(spitX, spitTop - 28, 6.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawElectricKnife = (
      bladeX: number,
      bladeY: number,
      bladeAngle: number,
      isSlicing: boolean
    ) => {
      const vibX = isSlicing ? Math.sin(bladeAngle * 3.1) * 1.4 : 0;
      const vibY = isSlicing ? Math.cos(bladeAngle * 2.7) * 1.2 : 0;
      const cx = bladeX + vibX;
      const cy = bladeY + vibY;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.18);

      const bladeR = Math.max(19, Math.min(27, width * 0.068));

      // Motion blur ring when running
      if (isSlicing) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, bladeR + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Circular rotary steel blade
      const bladeGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, bladeR);
      bladeGrad.addColorStop(0, '#f4f4f5');
      bladeGrad.addColorStop(0.7, '#d4d4d8');
      bladeGrad.addColorStop(1, '#71717a');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bladeR, 0, Math.PI * 2);
      ctx.fill();

      // Serrated teeth / radial spin lines
      ctx.save();
      ctx.rotate(bladeAngle);
      ctx.strokeStyle = isSlicing ? 'rgba(82, 82, 91, 0.45)' : 'rgba(63, 63, 70, 0.7)';
      ctx.lineWidth = 1.6;
      const teeth = 12;
      for (let i = 0; i < teeth; i++) {
        const a = (i * Math.PI * 2) / teeth;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (bladeR * 0.35), Math.sin(a) * (bladeR * 0.35));
        ctx.lineTo(Math.cos(a + 0.12) * bladeR, Math.sin(a + 0.12) * bladeR);
        ctx.stroke();
      }
      ctx.restore();

      // Center bolt
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(0, 0, bladeR * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Stainless protective half-hood on right/top half
      ctx.fillStyle = '#52525b';
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, bladeR + 2.5, -Math.PI * 0.58, Math.PI * 0.48);
      ctx.lineTo(6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ergonomic yellow/black ShawarmaRadar handle extending right
      const handleLen = Math.max(58, Math.min(82, width * 0.21));
      const handleGrad = ctx.createLinearGradient(8, -12, handleLen, 14);
      handleGrad.addColorStop(0, '#facc15');
      handleGrad.addColorStop(0.55, '#eab308');
      handleGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = handleGrad;
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(6, -10, handleLen, 21, 9);
      ctx.fill();
      ctx.stroke();

      // Dark rubberized grip inlay
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(22, -6, handleLen - 26, 13, 6);
      ctx.fill();

      // Power status LED on handle
      ctx.fillStyle = isSlicing ? '#4ade80' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(16, 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
      if (isSlicing) {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Trailing curled cord hint
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(handleLen + 6, 2);
      ctx.bezierCurveTo(handleLen + 24, 6, handleLen + 22, 26, handleLen + 38, 34);
      ctx.stroke();

      ctx.restore();
    };

    const drawActiveVessel = (
      dishId: DishId,
      weight: number,
      centerX: number,
      baseY: number,
      tLabel: string,
      hLabel: string
    ) => {
      const cfg = DISH_MAP[dishId];
      // Visual fill maps loosely to capacity so it's appetizing without serving as an exact ruler
      const visualFill = Math.min(1, weight / (cfg.maxCapGrams * 0.88));

      // Pedestal shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(centerX, baseY + 12, 74, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vessel base shape depending on activeDish
      ctx.save();
      if (dishId === 'laffa') {
        // Rolled flatbread open boat
        const grad = ctx.createLinearGradient(centerX - 65, baseY - 24, centerX + 65, baseY + 12);
        grad.addColorStop(0, '#eab308');
        grad.addColorStop(0.5, '#d99a38');
        grad.addColorStop(1, '#a16207');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(centerX - 66, baseY - 22, 132, 34, 16);
        ctx.fill();
        ctx.stroke();

        // Yellow wrapper band
        ctx.fillStyle = '#facc15';
        ctx.fillRect(centerX - 38, baseY - 12, 76, 22);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(centerX - 38, baseY - 3, 76, 5);
      } else if (dishId === 'pita') {
        // Plump golden pita pocket
        const grad = ctx.createRadialGradient(centerX, baseY - 8, 10, centerX, baseY - 4, 62);
        grad.addColorStop(0, '#fde0a3');
        grad.addColorStop(0.7, '#dfa24b');
        grad.addColorStop(1, '#9a5b18');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 56, baseY - 18);
        ctx.quadraticCurveTo(centerX, baseY - 6, centerX + 56, baseY - 18);
        ctx.quadraticCurveTo(centerX + 54, baseY + 16, centerX, baseY + 16);
        ctx.quadraticCurveTo(centerX - 54, baseY + 16, centerX - 56, baseY - 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Half-moon cut pita
        const grad = ctx.createLinearGradient(centerX - 46, baseY - 20, centerX + 46, baseY + 14);
        grad.addColorStop(0, '#fde0a3');
        grad.addColorStop(0.65, '#dfa24b');
        grad.addColorStop(1, '#9a5b18');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 45, baseY - 14);
        ctx.lineTo(centerX + 45, baseY - 20);
        ctx.quadraticCurveTo(centerX + 38, baseY + 15, centerX, baseY + 15);
        ctx.quadraticCurveTo(centerX - 40, baseY + 15, centerX - 45, baseY - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Accumulating pile of sliced shawarma strips
      const maxStrips = PILE_POOL.length;
      const visibleStrips = Math.round(visualFill * maxStrips);
      const pileWidth = dishId === 'half' ? 35 : dishId === 'pita' ? 45 : 52;
      const pileMaxH = dishId === 'half' ? 28 : dishId === 'pita' ? 34 : 40;

      for (let i = 0; i < visibleStrips; i++) {
        const s = PILE_POOL[i];
        const sx = centerX + s.nx * pileWidth;
        const sy = baseY - 16 - s.ny * pileMaxH * (0.35 + visualFill * 0.65);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(s.rot);
        ctx.fillStyle =
          s.tone > 0.66 ? '#b85c28' : s.tone > 0.33 ? '#8c3f18' : '#65280d';
        ctx.beginPath();
        ctx.roundRect(-s.len * 0.5, -3.2, s.len, 6.4, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(250, 196, 110, 0.25)';
        ctx.fillRect(-s.len * 0.3, -1.5, s.len * 0.5, 1.5);
        ctx.restore();
      }

      // Target & hidden weight badge directly under vessel (NEVER displays actual grams!)
      const pillY = baseY + 26;
      const pillText = `${tLabel}  •  ${hLabel}`;
      ctx.save();
      ctx.direction = /[\u0590-\u05FF]/.test(tLabel) ? 'rtl' : 'ltr';
      ctx.font = 'bold 12px Heebo, Inter, sans-serif';
      const textW = ctx.measureText(pillText).width;
      const pillW = Math.min(width - 24, textW + 26);
      ctx.fillStyle = 'rgba(18, 16, 11, 0.92)';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(centerX - pillW / 2, pillY - 12, pillW, 24, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde68a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, centerX, pillY + 0.5);
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const sim = simRef.current;
      const {
        activeDish: curDish,
        isPlaying: playing,
        forceSlicing: extSlicing,
        targetLabel: tLabel,
        hiddenWeightLabel: hLabel,
        dragHintLabel: hintLabel,
        onSliceStateChange: sliceCb,
        onDishStatusChange: statusCb,
      } = propsRef.current;

      const dishCfg = DISH_MAP[curDish];
      const currentWeight = dishWeightsRef.current[curDish] || 0;
      const atMaxCap = currentWeight >= dishCfg.maxCapGrams;
      const wantsSlice = playing && (sim.pointerActive || extSlicing);
      const activelyCutting = wantsSlice && !atMaxCap;

      if (activelyCutting !== sim.wasSlicing) {
        sim.wasSlicing = activelyCutting;
        sliceCb(activelyCutting);
      }

      // Accumulate weight while slicing
      if (activelyCutting) {
        const nextWeight = Math.min(dishCfg.maxCapGrams, currentWeight + SLICE_RATE_GPS * dt);
        dishWeightsRef.current[curDish] = nextWeight;
      }

      // Report status transitions (hasMeat / overflowing) without 60fps React spam
      const updatedWeight = dishWeightsRef.current[curDish] || 0;
      const hasMeat = updatedWeight >= 2;
      const overflowing = updatedWeight >= dishCfg.maxCapGrams - 0.5;
      const prevStatus = sim.reportedStatus[curDish];
      if (prevStatus.hasMeat !== hasMeat || prevStatus.overflowing !== overflowing) {
        prevStatus.hasMeat = hasMeat;
        prevStatus.overflowing = overflowing;
        statusCb(curDish, hasMeat, overflowing);
      }

      // Update animation timers
      sim.heatTime += dt;
      sim.spitAngle += dt * (activelyCutting ? 3.2 : 1.15);
      sim.bladeAngle += dt * (activelyCutting ? 40 : 2.5);
      sim.knifeEngage += ((wantsSlice ? 1 : 0) - sim.knifeEngage) * Math.min(1, dt * 14);

      if (extSlicing || (sim.pointerActive && !sim.pointerHasMoved)) {
        sim.autoSweepPhase += dt * 3.4;
        sim.knifeTargetYRatio = 0.36 + Math.sin(sim.autoSweepPhase) * 0.14;
      } else if (!wantsSlice) {
        sim.knifeTargetYRatio = 0.38 + Math.sin(sim.heatTime * 1.4) * 0.03;
      }
      sim.knifeCurrentYRatio +=
        (sim.knifeTargetYRatio - sim.knifeCurrentYRatio) * Math.min(1, dt * 16);

      // Compute geometry
      const spitX = width * 0.44;
      const broilerX = Math.max(16, spitX - Math.min(108, width * 0.27));
      const spitTop = height * 0.2;
      const spitBottom = height * 0.64;
      const spitH = spitBottom - spitTop;
      const maxRadius = Math.min(62, width * 0.165);
      const minRadius = maxRadius * 0.56;

      const knifeY = height * Math.max(0.21, Math.min(0.6, sim.knifeCurrentYRatio));
      const tNorm = Math.max(0, Math.min(1, (knifeY - spitTop) / spitH));
      const radiusAtKnife = minRadius + (maxRadius - minRadius) * (1 - tNorm * 0.72);
      const idleBladeX = spitX + radiusAtKnife + 38;
      const cuttingBladeX = spitX + radiusAtKnife - 2;
      const bladeX = idleBladeX + (cuttingBladeX - idleBladeX) * sim.knifeEngage;

      // Spawn falling shawarma shavings & sparks while actively cutting
      if (activelyCutting) {
        sim.shaveAccum += dt * 24;
        while (sim.shaveAccum >= 1) {
          sim.shaveAccum -= 1;
          sim.shavings.push({
            x: bladeX - 4 + (Math.random() - 0.5) * 8,
            y: knifeY + (Math.random() - 0.5) * 10,
            vx: (spitX - bladeX) * 0.35 + (Math.random() - 0.5) * 48,
            vy: -35 + Math.random() * 45,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 10,
            len: 12 + Math.random() * 10,
            thick: 4.5 + Math.random() * 2.5,
            tone: Math.random(),
          });
        }

        sim.sparkAccum += dt * 30;
        while (sim.sparkAccum >= 1) {
          sim.sparkAccum -= 1;
          sim.sparks.push({
            x: bladeX - 3,
            y: knifeY,
            vx: 40 + Math.random() * 90,
            vy: -70 + Math.random() * 80,
            life: 0,
            maxLife: 0.25 + Math.random() * 0.2,
          });
        }
      }

      // Advance physics for shavings & sparks
      const catchY = height * 0.79;
      for (let i = sim.shavings.length - 1; i >= 0; i--) {
        const s = sim.shavings[i];
        s.vy += 640 * dt;
        // Gently funnel toward center dish X
        s.vx += (spitX - s.x) * 1.4 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vRot * dt;
        if (s.y >= catchY) {
          sim.shavings.splice(i, 1);
        }
      }

      for (let i = sim.sparks.length - 1; i >= 0; i--) {
        const sp = sim.sparks[i];
        sp.life += dt;
        sp.vy += 260 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        if (sp.life >= sp.maxLife) {
          sim.sparks.splice(i, 1);
        }
      }

      // ======================== RENDER FRAME ========================
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Subtle warm grill backdrop glow
      const bgGlow = ctx.createRadialGradient(spitX, spitTop + spitH * 0.45, 20, spitX, height * 0.42, width * 0.85);
      bgGlow.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
      bgGlow.addColorStop(0.55, 'rgba(180, 83, 9, 0.06)');
      bgGlow.addColorStop(1, 'rgba(10, 10, 5, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Stainless vertical broiler machine on left
      const boxW = Math.min(36, width * 0.09);
      const boxH = spitH + 34;
      const boxTop = spitTop - 16;
      const boxGrad = ctx.createLinearGradient(broilerX, boxTop, broilerX + boxW, boxTop);
      boxGrad.addColorStop(0, '#18181b');
      boxGrad.addColorStop(0.65, '#3f3f46');
      boxGrad.addColorStop(1, '#27272a');
      ctx.fillStyle = boxGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(broilerX, boxTop, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();

      // 3 glowing ceramic heater coils facing the meat
      const pulse = 0.78 + Math.sin(sim.heatTime * 4.2) * 0.18;
      for (let r = 0; r < 3; r++) {
        const elemY = boxTop + 16 + r * ((boxH - 32) / 3);
        const elemH = (boxH - 48) / 3;
        ctx.save();
        ctx.shadowColor = `rgba(255, 102, 0, ${0.85 * pulse})`;
        ctx.shadowBlur = 14;
        const elemGrad = ctx.createLinearGradient(broilerX + boxW - 8, elemY, broilerX + boxW + 2, elemY);
        elemGrad.addColorStop(0, '#dc2626');
        elemGrad.addColorStop(1, '#fbbf24');
        ctx.fillStyle = elemGrad;
        ctx.beginPath();
        ctx.roundRect(broilerX + boxW - 9, elemY, 7, elemH, 3);
        ctx.fill();
        ctx.restore();
      }

      // Heat shimmer rays
      for (let h = 0; h < 4; h++) {
        const hy = spitTop + 25 + h * (spitH * 0.22);
        const wave = Math.sin(sim.heatTime * 5 + h * 1.6) * 4;
        ctx.strokeStyle = `rgba(251, 146, 60, ${0.18 * pulse})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(broilerX + boxW + 4, hy);
        ctx.quadraticCurveTo((broilerX + boxW + spitX - maxRadius) * 0.5, hy + wave, spitX - maxRadius * 0.9, hy - wave * 0.5);
        ctx.stroke();
      }

      // Subtle rising steam above spit
      for (let st = 0; st < 4; st++) {
        const phase = (sim.heatTime * 0.45 + st * 0.25) % 1;
        const sx = spitX + Math.sin(phase * 6 + st) * 14 - 8 + st * 6;
        const sy = spitTop - 18 - phase * 34;
        ctx.fillStyle = `rgba(255, 245, 220, ${(1 - phase) * 0.14})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 5 + phase * 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw rotating 3D shawarma spit
      drawMeatSpit(
        spitX,
        spitTop,
        spitBottom,
        maxRadius,
        minRadius,
        sim.spitAngle,
        knifeY,
        sim.knifeEngage
      );

      // Draw falling meat shavings
      for (const s of sim.shavings) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = s.tone > 0.6 ? '#b45309' : s.tone > 0.25 ? '#92400e' : '#78350f';
        ctx.beginPath();
        ctx.roundRect(-s.len * 0.5, -s.thick * 0.5, s.len, s.thick, 2.5);
        ctx.fill();
        ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
        ctx.fillRect(-s.len * 0.3, -s.thick * 0.3, s.len * 0.45, 1.4);
        ctx.restore();
      }

      // Draw sizzle sparks
      for (const sp of sim.sparks) {
        const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
        ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.2 * alpha + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw electric rotary knife
      drawElectricKnife(bladeX, knifeY, sim.bladeAngle, activelyCutting);

      // Draw active portion vessel at bottom
      drawActiveVessel(curDish, updatedWeight, spitX, height * 0.85, tLabel, hLabel);

      // Subtle touch/drag hint when idle and dish is still empty
      if (playing && !wantsSlice && !hasMeat) {
        const hintAlpha = 0.72 + Math.sin(sim.heatTime * 3.5) * 0.22;
        ctx.save();
        ctx.direction = /[\u0590-\u05FF]/.test(hintLabel) ? 'rtl' : 'ltr';
        ctx.font = 'bold 12px Heebo, Inter, sans-serif';
        const hw = Math.min(width - 16, ctx.measureText(hintLabel).width + 22);
        const hx = width * 0.5;
        const hy = 17;
        ctx.fillStyle = `rgba(250, 204, 21, ${0.15 * hintAlpha})`;
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.5 * hintAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hx - hw / 2, hy - 12, hw, 24, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(254, 240, 138, ${hintAlpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hintLabel, hx, hy + 0.5);
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      if (simNode.wasSlicing) {
        simNode.wasSlicing = false;
        propsRef.current.onSliceStateChange(false);
      }
    };
  }, [dishWeightsRef]);

  const updatePointerTarget = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height <= 0) return;
    const touchOffset = e.pointerType === 'touch' ? 24 : 0;
    const yRatio = (e.clientY - rect.top - touchOffset) / rect.height;
    simRef.current.knifeTargetYRatio = Math.max(0.16, Math.min(0.58, yRatio));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!propsRef.current.isPlaying) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
    const sim = simRef.current;
    sim.pointerActive = true;
    sim.pointerHasMoved = false;
    sim.pointerDownX = e.clientX;
    sim.pointerDownY = e.clientY;
    updatePointerTarget(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim.pointerActive || !propsRef.current.isPlaying) return;
    const dist = Math.hypot(e.clientX - sim.pointerDownX, e.clientY - sim.pointerDownY);
    if (dist > 6) {
      sim.pointerHasMoved = true;
    }
    updatePointerTarget(e);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    simRef.current.pointerActive = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="spit-canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="spit-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default ShawarmaSpitCanvas;
