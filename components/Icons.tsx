// Up arrow icon for upload
export const UpArrowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);
import React from 'react';

const withBasePath = (path: string) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
};

const LOGO_VERSION = '20260205';
const withLogoVersion = (path: string) => `${withBasePath(path)}?v=${LOGO_VERSION}`;

// Simple book icon (used for User Guide button)
export const BookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h12a2 2 0 0 1 2 2v12" />
    <path d="M4 4v14a2 2 0 0 0 2 2h12" />
    <path d="M8 4v16" />
  </svg>
);

// PMOMax logo, served from public/logos/pmomax_logo.png
export const PMOMaxIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img
    {...props}
    src={withLogoVersion('logos/pmomax_logo.png')}
    alt={props.alt ?? 'PMOMax logo'}
    onError={(e) => {
      const target = e.currentTarget;
      // Try fallback paths
      if (!target.dataset.tried) {
        target.dataset.tried = '1';
        target.src = withLogoVersion('pmomax_logo.png');
      } else if (target.dataset.tried === '1') {
        target.dataset.tried = '2';
        target.src = withLogoVersion('public/logos/pmomax_logo.png');
      } else {
        // Hide if all attempts fail
        target.style.display = 'none';
        console.error('PMOMax logo failed to load from all paths');
      }
    }}
  />
);

// Katalyst Street logo, served from public/logos/katalyst_street_logo_dark.png
export const KatalystIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img
    {...props}
    src={withLogoVersion('logos/katalyst_street_logo_dark.png')}
    alt={props.alt ?? 'Katalyst Street logo'}
    onError={(e) => {
      const target = e.currentTarget;
      // Try fallback paths
      if (!target.dataset.tried) {
        target.dataset.tried = '1';
        target.src = withLogoVersion('public/logos/katalyst_street_logo_dark.png');
      } else if (target.dataset.tried === '1') {
        target.dataset.tried = '2';
        target.src = withLogoVersion('logos/pmomax_logo.png');
      } else if (target.dataset.tried === '2') {
        target.dataset.tried = '3';
        target.src = withLogoVersion('public/logos/pmomax_logo.png');
      } else {
        // Hide if all attempts fail
        target.style.display = 'none';
        console.error('Katalyst Street logo failed to load from all paths');
      }
    }}
  />
);

// Hamburger / nav icon (used in Header mobile toggle)
export const NavIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// Notes icon (used in GeneralNotesPanel)
export const NotesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="13" y2="15" />
  </svg>
);

// Generic gold-themed section/icon accents for middle panel
export const OverviewIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="12" height="3" rx="1" />
    <rect x="3" y="15" width="8" height="3" rx="1" />
  </svg>
);

export const ScopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M8 9h8" />
    <path d="M8 12h5" />
    <path d="M8 15h6" />
  </svg>
);

// Updated: Horizontal Gantt bar icon
export const ScheduleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Horizontal Gantt bar: 3 bars of different lengths */}
    <rect x="3" y="6" width="14" height="2.5" rx="1" fill="currentColor" />
    <rect x="7" y="11" width="10" height="2.5" rx="1" fill="currentColor" />
    <rect x="5" y="16" width="7" height="2.5" rx="1" fill="currentColor" />
  </svg>
);

export const ResourcesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M4 17c1.2-2 2.8-3 4-3s2.8 1 4 3" />
    <path d="M12 17c1.2-2 2.8-3 4-3s2.8 1 4 3" />
  </svg>
);

export const RiskIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3 3.5 19h17L12 3z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.5" r="0.8" fill="currentColor" />
  </svg>
);

export const CommsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="5" width="16" height="11" rx="2" />
    <path d="M7 17v3l3-3" />
    <path d="M8 9h8" />
    <path d="M8 12h5" />
  </svg>
);
