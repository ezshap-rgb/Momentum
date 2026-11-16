import React from 'react';
import { PartSize, FinishGrade, getFinishGradeStyles } from '../services/focusMovement';

interface Props {
  partSize: PartSize;
  finishGrade: FinishGrade;
  isFilled: boolean;
  isJewelSlot?: boolean;
}

export const WatchPartVector: React.FC<Props> = ({
  partSize,
  finishGrade,
  isFilled,
  isJewelSlot = false,
}) => {
  const styles = getFinishGradeStyles(finishGrade);

  if (isJewelSlot) {
    return (
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
          isFilled
            ? 'bg-gradient-to-tr from-rose-500 via-pink-400 to-rose-600 border-rose-300 shadow-md shadow-rose-500/50 scale-105 animate-pulse'
            : 'bg-slate-900/60 border-dashed border-slate-700 opacity-40'
        }`}
        title={isFilled ? 'Bonus Stretch Jewel Earned!' : 'Stretch Jewel Slot'}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white/90">
          <polygon points="12,2 22,8.5 18,22 6,22 2,8.5" />
        </svg>
      </div>
    );
  }

  if (!isFilled) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 flex items-center justify-center text-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-800"></span>
      </div>
    );
  }

  // Render stylized flat vector based on part size
  switch (partSize) {
    case 'screw':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Screw`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'jewel':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Jewel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          </svg>
        </div>
      );

    case 'wheel':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Gear Wheel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" fill="none" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" />
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'bridge':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Bridge`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <path
              d="M4,16 C6,10 18,10 20,16 L18,18 C14,14 10,14 6,18 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </div>
      );

    case 'barrel':
    default:
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Mainspring Barrel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>
      );
  }
};
