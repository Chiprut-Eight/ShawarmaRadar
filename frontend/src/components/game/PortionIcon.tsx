import React, { useId } from 'react';
import type { DishId } from '../../game/shawarmaGameConfig';

interface PortionIconProps {
  type: DishId;
  fillRatio?: number;
  size?: number;
  showMeatInside?: boolean;
  className?: string;
}

const PortionIcon: React.FC<PortionIconProps> = ({
  type,
  fillRatio = 0.75,
  size = 64,
  showMeatInside = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const clampedFill = Math.max(0, Math.min(1, fillRatio));
  const meatScale = showMeatInside ? 0.55 + clampedFill * 0.65 : 0;

  if (type === 'laffa') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`laffaBread-${uid}`} x1="30" y1="22" x2="90" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f6c97a" />
            <stop offset="50%" stopColor="#dfa24b" />
            <stop offset="100%" stopColor="#b97729" />
          </linearGradient>
          <linearGradient id={`laffaWrap-${uid}`} x1="32" y1="56" x2="88" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Soft glow behind wrap */}
        <ellipse cx="60" cy="107" rx="28" ry="6" fill="rgba(0,0,0,0.45)" />

        {/* Back toasted flatbread collar */}
        <path
          d="M32 38 C32 23, 88 23, 88 38 L82 100 C81 106, 39 106, 38 100 Z"
          fill={`url(#laffaBread-${uid})`}
          stroke="#8a5318"
          strokeWidth="2.5"
        />
        {/* Flatbread char spots */}
        <ellipse cx="47" cy="34" rx="5" ry="2.2" fill="#925418" opacity="0.5" transform="rotate(-12 47 34)" />
        <ellipse cx="73" cy="36" rx="6" ry="2.3" fill="#925418" opacity="0.45" transform="rotate(14 73 36)" />

        {/* Shawarma meat mound peeking at top */}
        {showMeatInside && (
          <g transform={`translate(60 36) scale(${meatScale}) translate(-60 -36)`}>
            {/* Parsley & greens */}
            <circle cx="43" cy="33" r="6" fill="#22c55e" />
            <circle cx="77" cy="34" r="5.5" fill="#16a34a" />
            <circle cx="52" cy="27" r="5" fill="#4ade80" />
            {/* Roasted meat curls */}
            <path d="M39 36 C42 22, 57 18, 63 32 C68 18, 82 23, 81 37 Z" fill="#7c3818" />
            <ellipse cx="51" cy="30" rx="8.5" ry="5.5" fill="#9a4a22" transform="rotate(-14 51 30)" />
            <ellipse cx="68" cy="29" rx="8.5" ry="5.5" fill="#8b3e1b" transform="rotate(15 68 29)" />
            <ellipse cx="60" cy="25" rx="9" ry="5.2" fill="#b45c2c" />
            <path d="M47 29 Q55 24 62 29" stroke="#d98945" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M58 24 Q67 22 73 28" stroke="#f5b76b" strokeWidth="2" strokeLinecap="round" />
            {/* Tahini drizzle */}
            <path
              d="M44 33 Q51 28 57 34 Q63 27 70 33 Q74 30 77 34"
              stroke="#fef3c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Front rolled flap */}
        <path
          d="M34 40 C44 50, 76 50, 86 40 L82 99 C80 105, 40 105, 38 99 Z"
          fill={`url(#laffaBread-${uid})`}
          stroke="#995d1e"
          strokeWidth="2"
        />
        {/* Foil/paper sleeve */}
        <path
          d="M35 61 C47 68, 73 68, 85 61 L82 100 C80 106, 40 106, 38 100 Z"
          fill={`url(#laffaWrap-${uid})`}
          stroke="#92400e"
          strokeWidth="2"
        />
        {/* Sleeve diagonal stripe */}
        <path d="M38 77 Q60 83 82 77" stroke="#18181b" strokeWidth="5" opacity="0.82" />
        <path d="M39 87 Q60 92 81 87" stroke="#fef08a" strokeWidth="1.6" opacity="0.7" />
      </svg>
    );
  }

  if (type === 'pita') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`pitaCrust-${uid}`} cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#fde0a3" />
            <stop offset="65%" stopColor="#e3a756" />
            <stop offset="100%" stopColor="#b57126" />
          </radialGradient>
        </defs>

        <ellipse cx="60" cy="105" rx="33" ry="6" fill="rgba(0,0,0,0.45)" />

        {/* Back rim of open pita pocket */}
        <path
          d="M21 53 C21 31, 99 31, 99 53 C99 78, 86 102, 60 102 C34 102, 21 78, 21 53 Z"
          fill="#c48335"
          stroke="#8a5216"
          strokeWidth="2.5"
        />

        {/* Inside pocket shadow */}
        <ellipse cx="60" cy="52" rx="31" ry="12" fill="#451a03" />

        {/* Filling inside pita */}
        {showMeatInside && (
          <g transform={`translate(60 51) scale(${meatScale}) translate(-60 -51)`}>
            {/* Salad accents */}
            <circle cx="37" cy="48" r="6" fill="#22c55e" />
            <circle cx="83" cy="49" r="5.5" fill="#16a34a" />
            <circle cx="48" cy="41" r="4.5" fill="#ef4444" />
            <circle cx="72" cy="41" r="4.5" fill="#ef4444" />
            {/* Shawarma strips */}
            <ellipse cx="48" cy="46" rx="10" ry="6.5" fill="#8b3e1b" transform="rotate(-12 48 46)" />
            <ellipse cx="72" cy="46" rx="10" ry="6.5" fill="#7c3818" transform="rotate(14 72 46)" />
            <ellipse cx="60" cy="42" rx="11" ry="7" fill="#a85024" />
            <ellipse cx="55" cy="36" rx="8" ry="5" fill="#b8602d" transform="rotate(-8 55 36)" />
            <ellipse cx="67" cy="37" rx="7.5" ry="4.5" fill="#93421c" transform="rotate(10 67 37)" />
            <path d="M47 42 Q55 37 64 41" stroke="#e49b50" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M58 36 Q66 34 73 39" stroke="#f5be78" strokeWidth="2" strokeLinecap="round" />
            {/* Creamy tahini */}
            <path
              d="M39 48 Q48 41 56 48 Q64 40 72 48 Q77 44 82 47"
              stroke="#fef3c7"
              strokeWidth="2.7"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Front plump pita wall */}
        <path
          d="M21 53 C35 63, 85 63, 99 53 C99 81, 85 103, 60 103 C35 103, 21 81, 21 53 Z"
          fill={`url(#pitaCrust-${uid})`}
          stroke="#8a5216"
          strokeWidth="2.5"
        />
        {/* Baked texture & sesame flecks */}
        <ellipse cx="44" cy="76" rx="7" ry="4" fill="#c07e31" opacity="0.35" transform="rotate(-18 44 76)" />
        <ellipse cx="76" cy="74" rx="6" ry="3.5" fill="#b67328" opacity="0.35" transform="rotate(16 76 74)" />
        <ellipse cx="60" cy="88" rx="8" ry="3.5" fill="#c07e31" opacity="0.3" />
        <circle cx="52" cy="69" r="1.4" fill="#fef3c7" opacity="0.85" />
        <circle cx="67" cy="68" r="1.4" fill="#fef3c7" opacity="0.85" />
        <circle cx="59" cy="76" r="1.3" fill="#fef3c7" opacity="0.75" />
      </svg>
    );
  }

  // 'half' — Half-moon cut pita
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`halfCrust-${uid}`} x1="28" y1="45" x2="92" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde0a3" />
          <stop offset="55%" stopColor="#e2a553" />
          <stop offset="100%" stopColor="#b57025" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="103" rx="28" ry="5.5" fill="rgba(0,0,0,0.45)" />

      {/* Back cut half-pita rim */}
      <path
        d="M27 56 L93 48 C93 78, 79 99, 60 99 C41 99, 27 79, 27 56 Z"
        fill="#be7c30"
        stroke="#854f15"
        strokeWidth="2.4"
      />
      <ellipse cx="60" cy="52" rx="27" ry="9" fill="#451a03" transform="rotate(-7 60 52)" />

      {/* Meat inside half pita */}
      {showMeatInside && (
        <g transform={`translate(60 50) scale(${meatScale}) translate(-60 -50)`}>
          <circle cx="42" cy="48" r="5" fill="#22c55e" />
          <circle cx="77" cy="45" r="4.8" fill="#16a34a" />
          <ellipse cx="51" cy="46" rx="8.5" ry="5.5" fill="#8b3e1b" transform="rotate(-10 51 46)" />
          <ellipse cx="68" cy="44" rx="8.5" ry="5.5" fill="#7c3818" transform="rotate(10 68 44)" />
          <ellipse cx="59" cy="41" rx="9" ry="5.5" fill="#ad5628" />
          <path d="M49 42 Q58 37 68 41" stroke="#ebb066" strokeWidth="2.1" strokeLinecap="round" />
          <path
            d="M44 48 Q52 42 59 47 Q66 41 74 46"
            stroke="#fef3c7"
            strokeWidth="2.3"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {/* Front cut half-pita belly */}
      <path
        d="M27 56 C44 63, 76 59, 93 48 C93 79, 78 99, 60 99 C41 99, 27 79, 27 56 Z"
        fill={`url(#halfCrust-${uid})`}
        stroke="#854f15"
        strokeWidth="2.4"
      />
      {/* Diagonal cut rim highlight */}
      <path d="M29 56 Q60 61 91 49" stroke="#fef3c7" strokeWidth="1.6" opacity="0.55" />
      <ellipse cx="48" cy="75" rx="5.5" ry="3" fill="#b87528" opacity="0.35" transform="rotate(-14 48 75)" />
      <ellipse cx="71" cy="72" rx="5" ry="3" fill="#b87528" opacity="0.35" transform="rotate(14 71 72)" />
    </svg>
  );
};

export default PortionIcon;
