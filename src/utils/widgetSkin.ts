/**
 * Maps persisted WidgetCustomizer theme / frame to the on-screen pet widget “skin”.
 */
import type { CSSProperties } from 'react';
import type { WidgetCustomizer } from '../types';

export function getPetWidgetShellSurface(customizer: WidgetCustomizer): {
  className: string;
  style: CSSProperties;
} {
  const { theme, borderStyle, opacity } = customizer;

  const themeClass: Record<WidgetCustomizer['theme'], string> = {
    pastel:
      'bg-gradient-to-br from-rose-100/95 via-fuchsia-50/90 to-sky-100/95 shadow-[0_12px_40px_rgba(244,114,182,0.25)]',
    dark:
      'bg-gradient-to-br from-slate-900 via-violet-950/95 to-slate-950 shadow-[0_16px_48px_rgba(0,0,0,0.55)]',
    glass:
      'bg-gradient-to-br from-white/30 via-indigo-100/25 to-violet-200/30 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.2)]',
    'retro-win98':
      'bg-[#c0c0c0] shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#404040,2px_2px_0_#000000]',
    transparent: 'bg-transparent shadow-none ring-0',
  };

  const borderClass: Record<WidgetCustomizer['borderStyle'], string> = {
    none: 'border border-transparent',
    thin: 'border border-slate-500/25',
    double: 'border-4 border-double border-slate-600/40',
    retro: 'border-2 border-t-white border-l-white border-b-slate-600 border-r-slate-600',
  };

  const base =
    'rounded-[2rem] ring-1 ring-black/5 transition-[background,box-shadow,border-color] duration-300';

  return {
    className: `${theme === 'transparent' ? 'rounded-[2rem]' : base} ${
      themeClass[theme] ?? themeClass.pastel
    } ${theme === 'transparent' ? 'border border-transparent' : borderClass[borderStyle] ?? borderClass.thin}`,
    style: {
      opacity:
        theme === 'transparent'
          ? 1
          : typeof opacity === 'number' && opacity > 0
            ? Math.min(1, Math.max(0.15, opacity))
            : 1,
    },
  };
}
