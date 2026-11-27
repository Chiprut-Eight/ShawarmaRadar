import type { DishId, PlayerGender, RoundEvaluation } from '../game/shawarmaGameConfig';

export interface ShareCardParams {
  playerName: string;
  gender: PlayerGender;
  evaluation: RoundEvaluation;
  lang: 'he' | 'en';
  siteHost: string;
}

export interface GeneratedShareCard {
  blob: Blob;
  dataUrl: string;
}

function loadImageWithTimeout(src: string, timeoutMs = 2000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      }
    };
    img.src = src;
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) {
        // Append remaining words to last line
        const rest = words.slice(i + 1).join(' ');
        if (rest) current = `${current} ${rest}`;
        break;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

function drawCanvasDishIllustration(
  ctx: CanvasRenderingContext2D,
  dishId: DishId,
  cx: number,
  cy: number,
  size: number,
  fillRatio: number
): void {
  const s = size / 120;
  const clamped = Math.max(0.15, Math.min(1.05, fillRatio));

  ctx.save();
  ctx.translate(cx - 60 * s, cy - 60 * s);
  ctx.scale(s, s);

  if (dishId === 'laffa') {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(60, 107, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back toasted laffa bread
    const breadGrad = ctx.createLinearGradient(32, 24, 88, 104);
    breadGrad.addColorStop(0, '#f6c97a');
    breadGrad.addColorStop(0.5, '#dfa24b');
    breadGrad.addColorStop(1, '#b97729');
    ctx.fillStyle = breadGrad;
    ctx.strokeStyle = '#8a5318';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(32, 38);
    ctx.bezierCurveTo(32, 23, 88, 23, 88, 38);
    ctx.lineTo(82, 100);
    ctx.bezierCurveTo(81, 106, 39, 106, 38, 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Meat mound inside top
    const mScale = 0.65 + clamped * 0.45;
    ctx.save();
    ctx.translate(60, 36);
    ctx.scale(mScale, mScale);
    ctx.translate(-60, -36);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(43, 33, 6, 0, Math.PI * 2);
    ctx.arc(77, 34, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b3e1b';
    ctx.beginPath();
    ctx.ellipse(51, 30, 9, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a64d21';
    ctx.beginPath();
    ctx.ellipse(68, 29, 9, 6, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b45c2c';
    ctx.beginPath();
    ctx.ellipse(60, 25, 10, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(44, 33);
    ctx.quadraticCurveTo(52, 27, 60, 33);
    ctx.quadraticCurveTo(68, 27, 77, 33);
    ctx.stroke();
    ctx.restore();

    // Front laffa wrap & yellow ShawarmaRadar cuff
    ctx.fillStyle = breadGrad;
    ctx.beginPath();
    ctx.moveTo(34, 40);
    ctx.bezierCurveTo(44, 50, 76, 50, 86, 40);
    ctx.lineTo(82, 99);
    ctx.bezierCurveTo(80, 105, 40, 105, 38, 99);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const wrapGrad = ctx.createLinearGradient(35, 61, 85, 104);
    wrapGrad.addColorStop(0, '#facc15');
    wrapGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = wrapGrad;
    ctx.strokeStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(35, 61);
    ctx.bezierCurveTo(47, 68, 73, 68, 85, 61);
    ctx.lineTo(82, 100);
    ctx.bezierCurveTo(80, 106, 40, 106, 38, 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(24,24,27,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(38, 77);
    ctx.quadraticCurveTo(60, 83, 82, 77);
    ctx.stroke();
  } else if (dishId === 'pita') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(60, 105, 33, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back pita wall
    ctx.fillStyle = '#c48335';
    ctx.strokeStyle = '#8a5216';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(21, 53);
    ctx.bezierCurveTo(21, 31, 99, 31, 99, 53);
    ctx.bezierCurveTo(99, 78, 86, 102, 60, 102);
    ctx.bezierCurveTo(34, 102, 21, 78, 21, 53);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(60, 52, 31, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const mScale = 0.65 + clamped * 0.42;
    ctx.save();
    ctx.translate(60, 51);
    ctx.scale(mScale, mScale);
    ctx.translate(-60, -51);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(37, 48, 6, 0, Math.PI * 2);
    ctx.arc(83, 49, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b3e1b';
    ctx.beginPath();
    ctx.ellipse(48, 46, 10, 6.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c3818';
    ctx.beginPath();
    ctx.ellipse(72, 46, 10, 6.5, 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a85024';
    ctx.beginPath();
    ctx.ellipse(60, 41, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(40, 48);
    ctx.quadraticCurveTo(50, 40, 60, 47);
    ctx.quadraticCurveTo(70, 40, 81, 47);
    ctx.stroke();
    ctx.restore();

    // Front pita belly
    const crustGrad = ctx.createRadialGradient(60, 70, 8, 60, 75, 45);
    crustGrad.addColorStop(0, '#fde0a3');
    crustGrad.addColorStop(0.65, '#e3a756');
    crustGrad.addColorStop(1, '#b57126');
    ctx.fillStyle = crustGrad;
    ctx.strokeStyle = '#8a5216';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(21, 53);
    ctx.bezierCurveTo(35, 63, 85, 63, 99, 53);
    ctx.bezierCurveTo(99, 81, 85, 103, 60, 103);
    ctx.bezierCurveTo(35, 103, 21, 81, 21, 53);
    ctx.fill();
    ctx.stroke();
  } else {
    // Half pita
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(60, 103, 28, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#be7c30';
    ctx.strokeStyle = '#854f15';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(27, 56);
    ctx.lineTo(93, 48);
    ctx.bezierCurveTo(93, 78, 79, 99, 60, 99);
    ctx.bezierCurveTo(41, 99, 27, 79, 27, 56);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(60, 52);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(0, 0, 27, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const mScale = 0.65 + clamped * 0.42;
    ctx.save();
    ctx.translate(60, 50);
    ctx.scale(mScale, mScale);
    ctx.translate(-60, -50);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(42, 48, 5, 0, Math.PI * 2);
    ctx.arc(77, 45, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b3e1b';
    ctx.beginPath();
    ctx.ellipse(51, 46, 8.5, 5.5, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c3818';
    ctx.beginPath();
    ctx.ellipse(68, 44, 8.5, 5.5, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ad5628';
    ctx.beginPath();
    ctx.ellipse(59, 41, 9.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(44, 48);
    ctx.quadraticCurveTo(54, 41, 61, 47);
    ctx.quadraticCurveTo(68, 41, 75, 46);
    ctx.stroke();
    ctx.restore();

    const halfGrad = ctx.createLinearGradient(28, 48, 92, 99);
    halfGrad.addColorStop(0, '#fde0a3');
    halfGrad.addColorStop(0.55, '#e2a553');
    halfGrad.addColorStop(1, '#b57025');
    ctx.fillStyle = halfGrad;
    ctx.strokeStyle = '#854f15';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(27, 56);
    ctx.bezierCurveTo(44, 63, 76, 59, 93, 48);
    ctx.bezierCurveTo(93, 79, 78, 99, 60, 99);
    ctx.bezierCurveTo(41, 99, 27, 79, 27, 56);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export async function generateResultShareCard(
  params: ShareCardParams
): Promise<GeneratedShareCard> {
  const { playerName, gender, evaluation, lang, siteHost } = params;
  const isHe = lang === 'he';

  // Wait briefly for web fonts to settle so Heebo renders sharply
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 900)),
    ]);
  }

  const logoImg = await loadImageWithTimeout('/logo.png', 2000);

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context');
  }

  // 1. Deep dark radar-amber backdrop
  const bg = ctx.createRadialGradient(W / 2, 580, 60, W / 2, H / 2, 1150);
  bg.addColorStop(0, '#261b09');
  bg.addColorStop(0.45, '#120e06');
  bg.addColorStop(1, '#070704');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Concentric radar rings centered around score gauge
  const radarCenterY = 630;
  ctx.save();
  for (let r = 160; r <= 760; r += 150) {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, radarCenterY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Radar crosshairs
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.06)';
  ctx.beginPath();
  ctx.moveTo(W / 2, 120);
  ctx.lineTo(W / 2, 1800);
  ctx.moveTo(60, radarCenterY);
  ctx.lineTo(W - 60, radarCenterY);
  ctx.stroke();
  ctx.restore();

  // Outer card frame (stays well inside Story safe zone)
  ctx.save();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(44, 96, W - 88, H - 192, 42);
  ctx.stroke();
  ctx.restore();

  // 2. Top Brand Header (preserve natural aspect ratio of wide /logo.png)
  if (logoImg) {
    const aspect = (logoImg.naturalWidth || 280) / Math.max(1, logoImg.naturalHeight || 100);
    const logoH = 120;
    const logoW = Math.min(540, Math.round(logoH * aspect));
    const logoX = (W - logoW) / 2;
    const logoY = 114;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#facc15';
    ctx.font = '900 50px Inter, Heebo, sans-serif';
    ctx.fillText('ShawarmaRadar', W / 2, 174);
    ctx.restore();
  }

  ctx.save();
  ctx.direction = isHe ? 'rtl' : 'ltr';
  ctx.fillStyle = '#d4d4d8';
  ctx.font = '700 28px Heebo, Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isHe ? 'אתגר השווארמה הרשמי' : 'Official Shawarma Challenge',
    W / 2,
    258
  );
  ctx.restore();

  // 3. Player Nameplate Pill (y = 298..374)
  const roleHe = gender === 'female' ? 'שווארמולוגית' : 'שווארמולוג';
  const cleanName = playerName.trim() || (isHe ? roleHe : 'Shawarmologist');
  const nameBadgeText = isHe ? `${roleHe}: ${cleanName}` : `Shawarmologist: ${cleanName}`;
  ctx.save();
  ctx.font = '800 38px Heebo, Inter, sans-serif';
  ctx.direction = isHe ? 'rtl' : 'ltr';
  const nameW = Math.min(860, ctx.measureText(nameBadgeText).width + 90);
  const nameX = (W - nameW) / 2;
  const nameY = 298;
  ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(nameX, nameY, nameW, 76, 38);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameBadgeText, W / 2, nameY + 39);
  ctx.restore();

  // 4. Victory Rank Title & Subtitle (y = 404..540)
  const rankTitle = isHe ? evaluation.rank.titleHe : evaluation.rank.titleEn;
  const rankSubtitle = isHe ? evaluation.rank.subtitleHe : evaluation.rank.subtitleEn;

  ctx.save();
  ctx.direction = isHe ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px Heebo, Inter, sans-serif';
  const titleLines = wrapTextLines(ctx, rankTitle, 900, 2);
  let textY = 404;
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, textY);
    textY += 62;
  }

  ctx.fillStyle = '#d1d5db';
  ctx.font = '500 27px Heebo, Inter, sans-serif';
  const subLines = wrapTextLines(ctx, rankSubtitle, 860, 2);
  textY += 8;
  for (const line of subLines) {
    ctx.fillText(line, W / 2, textY);
    textY += 36;
  }
  ctx.restore();

  // 5. Overall Accuracy Gauge Ring (y = 550..790)
  const gaugeY = 668;
  const gaugeR = 96;
  ctx.save();
  // Glow behind ring
  const glow = ctx.createRadialGradient(W / 2, gaugeY, 40, W / 2, gaugeY, 150);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(W / 2, gaugeY, 150, 0, Math.PI * 2);
  ctx.fill();

  // Track ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(W / 2, gaugeY, gaugeR, 0, Math.PI * 2);
  ctx.stroke();

  // Progress arc
  const pct = Math.max(0.02, evaluation.overallAccuracy / 100);
  ctx.strokeStyle = evaluation.rank.accentColor;
  ctx.lineCap = 'round';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(W / 2, gaugeY, gaugeR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();

  // Percentage number inside
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px Inter, Heebo, sans-serif';
  ctx.fillText(`${evaluation.overallAccuracy}%`, W / 2, gaugeY - 8);

  ctx.direction = isHe ? 'rtl' : 'ltr';
  ctx.fillStyle = '#fde68a';
  ctx.font = '700 24px Heebo, Inter, sans-serif';
  ctx.fillText(isHe ? 'דיוק כללי' : 'ACCURACY', W / 2, gaugeY + 38);
  ctx.restore();

  // 6. Three Dish Result Cards (y = 815..1545)
  const cardX = 92;
  const cardW = W - 184;
  const cardH = 218;
  const cardGap = 24;
  const startY = 820;

  evaluation.dishes.forEach((dish, idx) => {
    const cy = startY + idx * (cardH + cardGap);

    // Card background
    ctx.save();
    ctx.fillStyle = 'rgba(25, 21, 11, 0.94)';
    ctx.strokeStyle =
      dish.grade === 'bullseye'
        ? 'rgba(74, 222, 128, 0.7)'
        : 'rgba(250, 204, 21, 0.32)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cy, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Dish Vector Illustration on the visual lead side (right side in RTL, left side in LTR)
    const iconSize = 148;
    const iconCenterX = isHe ? cardX + cardW - 102 : cardX + 102;
    const iconCenterY = cy + cardH / 2 - 4;
    drawCanvasDishIllustration(
      ctx,
      dish.dishId,
      iconCenterX,
      iconCenterY,
      iconSize,
      dish.actualGrams / dish.maxCapGrams
    );

    // Text column area
    const textRightX = cardX + cardW - 205;
    const textLeftX = cardX + 205;
    const dishTitle = isHe ? dish.labelHe : dish.labelEn;

    ctx.save();
    ctx.direction = isHe ? 'rtl' : 'ltr';
    ctx.textAlign = isHe ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 38px Heebo, Inter, sans-serif';
    ctx.fillText(dishTitle, isHe ? textRightX : textLeftX, cy + 28);

    // Target vs Actual weights
    const weightLine = isHe
      ? `שקלת: ${dish.actualGrams} גרם  •  יעד: ${dish.targetGrams} גרם`
      : `Sliced: ${dish.actualGrams}g  •  Target: ${dish.targetGrams}g`;
    ctx.fillStyle = '#d4d4d8';
    ctx.font = '600 26px Heebo, Inter, sans-serif';
    ctx.fillText(weightLine, isHe ? textRightX : textLeftX, cy + 82);

    // Diff label
    let diffLabel: string;
    let diffColor = '#facc15';
    if (dish.grade === 'bullseye') {
      diffLabel = isHe ? '🎯 בול פגיעה!' : '🎯 Bullseye!';
      diffColor = '#4ade80';
    } else if (dish.diffGrams > 0) {
      diffLabel = isHe ? `עודף של ${dish.diffGrams} גרם` : `+${dish.diffGrams}g over`;
      diffColor = dish.grade === 'great' ? '#fde047' : '#fb923c';
    } else {
      diffLabel = isHe ? `חסרים ${Math.abs(dish.diffGrams)} גרם` : `${dish.diffGrams}g under`;
      diffColor = dish.grade === 'great' ? '#fde047' : '#f87171';
    }
    ctx.fillStyle = diffColor;
    ctx.font = '700 25px Heebo, Inter, sans-serif';
    ctx.fillText(diffLabel, isHe ? textRightX : textLeftX, cy + 124);
    ctx.restore();

    // Score percentage badge on opposite side of card
    ctx.save();
    const badgeX = isHe ? cardX + 42 : cardX + cardW - 178;
    const badgeY = cy + 36;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = diffColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, 136, 78, 18);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = diffColor;
    ctx.font = '900 38px Inter, Heebo, sans-serif';
    ctx.fillText(`${dish.accuracy}%`, badgeX + 68, badgeY + 40);
    ctx.restore();

    // Progress bar across bottom of text column
    const barX = isHe ? cardX + 42 : textLeftX;
    const barW = cardW - 247;
    const barY = cy + cardH - 38;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 12, 6);
    ctx.fill();

    const fillW = Math.max(12, Math.round((barW * dish.accuracy) / 100));
    ctx.fillStyle = diffColor;
    ctx.beginPath();
    ctx.roundRect(isHe ? barX + (barW - fillW) : barX, barY, fillW, 12, 6);
    ctx.fill();
    ctx.restore();
  });

  // 7. Bottom Challenge CTA (y = 1565..1755)
  ctx.save();
  ctx.direction = isHe ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 34px Heebo, Inter, sans-serif';
  ctx.fillText(
    isHe ? 'חושבים שאתם שווארמולוגים טובים יותר? בואו לשחק!' : 'Think you can slice closer? Try now!',
    W / 2,
    1570
  );

  // Site host pill
  const ctaPillW = 620;
  const ctaPillX = (W - ctaPillW) / 2;
  const ctaPillY = 1635;
  const ctaGrad = ctx.createLinearGradient(ctaPillX, ctaPillY, ctaPillX + ctaPillW, ctaPillY);
  ctaGrad.addColorStop(0, '#facc15');
  ctaGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = ctaGrad;
  ctx.beginPath();
  ctx.roundRect(ctaPillX, ctaPillY, ctaPillW, 74, 37);
  ctx.fill();

  ctx.direction = 'ltr';
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'middle';
  ctx.font = '900 30px Inter, Heebo, sans-serif';
  ctx.fillText(siteHost, W / 2, ctaPillY + 38);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to export PNG image'));
      },
      'image/png',
      0.95
    );
  });

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  return { blob, dataUrl };
}
