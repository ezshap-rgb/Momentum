import React from 'react';
import { CollectibleWatch } from '../services/focusCollection';

interface WatchVectorProps {
  watch: CollectibleWatch;
  size?: 'sm' | 'md' | 'lg';
}

export const WatchVectorIllustration: React.FC<WatchVectorProps> = ({
  watch,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-64 h-64',
  };

  const hasCase = watch.unlocked_components.case;
  const hasDial = watch.unlocked_components.dial;
  const hasHands = watch.unlocked_components.hands;
  const hasCrystal = watch.unlocked_components.crystal_crown;

  // Colors based on material
  const caseGradient =
    watch.case_material === 'Rose Gold'
      ? ['#f43f5e', '#fb7185', '#be123c']
      : watch.case_material === 'Titanium'
      ? ['#64748b', '#94a3b8', '#334155']
      : ['#94a3b8', '#e2e8f0', '#475569']; // Stainless steel

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl select-none">
        <defs>
          {/* Case metallic gradient */}
          <linearGradient id={`caseGrad_${watch.watch_id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={caseGradient[0]} />
            <stop offset="50%" stopColor={caseGradient[1]} />
            <stop offset="100%" stopColor={caseGradient[2]} />
          </linearGradient>

          {/* Dial subtle texture */}
          <radialGradient id={`dialGrad_${watch.watch_id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="85%" stopColor="#020617" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>

        {/* Lugs (Upper and Lower Strap attachments) */}
        {hasCase && (
          <>
            <polygon points="68,22 80,45 120,45 132,22" fill={caseGradient[2]} />
            <polygon points="68,178 80,155 120,155 132,178" fill={caseGradient[2]} />
          </>
        )}

        {/* Outer Watch Case */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill={hasCase ? `url(#caseGrad_${watch.watch_id})` : '#1e293b'}
          stroke={hasCase ? '#ffffff33' : '#334155'}
          strokeWidth="3"
        />

        {/* Winding Crown (Unlocked in Week 4) */}
        {hasCrystal ? (
          <path d="M 172,93 L 182,95 L 182,105 L 172,107 Z" fill={caseGradient[1]} stroke="#ffffff55" strokeWidth="1" />
        ) : (
          <path d="M 172,95 L 178,96 L 178,104 L 172,105 Z" fill="#334155" opacity="0.3" />
        )}

        {/* Inner Bezel Ring */}
        <circle cx="100" cy="100" r="62" fill="#090d16" stroke="#ffffff15" strokeWidth="2" />

        {/* Watch Dial (Unlocked in Week 2) */}
        {hasDial ? (
          <g>
            <circle cx="100" cy="100" r="58" fill={`url(#dialGrad_${watch.watch_id})`} />

            {/* Hour Markers (12, 3, 6, 9) */}
            <line x1="100" y1="46" x2="100" y2="52" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="154" y1="100" x2="148" y2="100" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="100" y1="154" x2="100" y2="148" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="46" y1="100" x2="52" y2="100" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

            {/* Caliber Label on Dial */}
            <text x="100" y="80" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold" letterSpacing="1">
              {watch.caliber}
            </text>

            {/* Complication Subdial (e.g. Moonphase or Small Seconds) */}
            {watch.complications.length > 0 && (
              <g transform="translate(100, 126)">
                <circle cx="0" cy="0" r="14" fill="#020617" stroke="#818cf855" strokeWidth="1" />
                <circle cx="0" cy="0" r="3" fill="#c084fc" />
                <path d="M -8,0 A 8,8 0 0,0 8,0 Z" fill="#38bdf8" opacity="0.7" />
              </g>
            )}
          </g>
        ) : (
          <g opacity="0.3">
            <circle cx="100" cy="100" r="58" fill="#0f172a" stroke="#334155" strokeDasharray="3 3" />
            <text x="100" y="103" textAnchor="middle" fill="#64748b" fontSize="8">
              Awaiting Dial
            </text>
          </g>
        )}

        {/* Hands (Hour & Minute) (Unlocked in Week 3) */}
        {hasHands ? (
          <g>
            {/* Hour hand pointing at ~10 o'clock */}
            <line
              x1="100"
              y1="100"
              x2="78"
              y2="75"
              stroke="#f8fafc"
              strokeWidth="4"
              strokeLinecap="round"
              filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.6))"
            />
            {/* Minute hand pointing at ~2 o'clock */}
            <line
              x1="100"
              y1="100"
              x2="132"
              y2="68"
              stroke="#f8fafc"
              strokeWidth="3"
              strokeLinecap="round"
              filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.6))"
            />
            {/* Blued Steel Seconds hand */}
            <line
              x1="100"
              y1="112"
              x2="100"
              y2="50"
              stroke="#60a5fa"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Center Cap */}
            <circle cx="100" cy="100" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          </g>
        ) : null}

        {/* Sapphire Crystal Sheen (Unlocked in Week 4) */}
        {hasCrystal && (
          <path
            d="M 52,65 A 60,60 0 0,1 148,65 A 58,58 0 0,0 52,65 Z"
            fill="#ffffff"
            opacity="0.12"
          />
        )}
      </svg>
    </div>
  );
};
