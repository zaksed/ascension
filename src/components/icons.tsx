/** Icônes SVG originales (trait 2 px), sans dépendance. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></Svg>;
export const IconMap = (p: P) => <Svg {...p}><path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="M9 4v13M15 7v13" /></Svg>;
export const IconTarget = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Svg>;
export const IconClipboard = (p: P) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M8.5 12h7M8.5 16h5" /></Svg>;
export const IconChart = (p: P) => <Svg {...p}><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></Svg>;
export const IconSettings = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
export const IconFlame = (p: P) => <Svg {...p}><path d="M12 21c-4 0-7-2.8-7-6.6 0-3.3 2.4-5.5 4-7.4.3 2 1.4 3.2 2.6 3.6C12 7.6 12.8 5 15 3c.4 3 4 5.4 4 10.4 0 4.3-3 7.6-7 7.6z" /></Svg>;
export const IconSnow = (p: P) => <Svg {...p}><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></Svg>;
export const IconCrown = (p: P) => <Svg {...p}><path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 10H5z" /><path d="M5 21h14" /></Svg>;
export const IconStar = (p: P) => <Svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></Svg>;
export const IconPlay = (p: P) => <Svg {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></Svg>;
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" /></Svg>;
export const IconReplay = (p: P) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></Svg>;
export const IconHeadphones = (p: P) => <Svg {...p}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4.5" height="6.5" rx="1.5" /><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5" /></Svg>;
export const IconBook = (p: P) => <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></Svg>;
export const IconFlag = (p: P) => <Svg {...p}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const IconBulb = (p: P) => <Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></Svg>;
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></Svg>;
export const IconChevronLeft = (p: P) => <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>;
export const IconChevronRight = (p: P) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>;
export const IconLock = (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
export const IconTrophy = (p: P) => <Svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4" /><path d="M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z" /></Svg>;
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M4.5 19.5h15" /></Svg>;
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 15.5v-11M7 9l5-5 5 5" /><path d="M4.5 19.5h15" /></Svg>;
export const IconBolt = (p: P) => <Svg {...p}><path d="M13 3 5 13.5h6L10.5 21 19 10h-6z" /></Svg>;
export const IconRefresh = (p: P) => <Svg {...p}><path d="M20 12a8 8 0 0 1-14.2 5M4 12a8 8 0 0 1 14.2-5" /><path d="M18.5 3v4h-4M5.5 21v-4h4" /></Svg>;
export const IconText = (p: P) => <Svg {...p}><path d="M5 6h14M5 10h14M5 14h9M5 18h11" /></Svg>;
export const IconEye = (p: P) => <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const IconMountain = (p: P) => <Svg {...p}><path d="m2.5 20 7-12 4 6.5 2.5-3.5 5.5 9z" /><path d="M9.5 8V3.5l3 1.5-3 1.5" /></Svg>;
