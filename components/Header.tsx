import React from 'react';
import { NavIcon, PMOMaxIcon, KatalystIcon, BookIcon } from './Icons';
import { ContactUsButton } from './ContactUsButton';

interface HeaderProps {
  onNavToggle: () => void;
  onHelp: () => void;
  onUserGuide: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(
  ({ onNavToggle, onHelp, onUserGuide }) => {
    return (
      <header
		className="flex items-center justify-between w-full bg-brand-panel border-b-2 border-brand-border sticky top-0 z-20 px-4 sm:px-6 lg:px-10 xl:px-14"
		style={{ minHeight: '64px' }}
      >
        {/* Left: PMOMAX logo and title */}
        <div className="flex items-center gap-4">
          <PMOMaxIcon 
            className="h-10 w-10 text-brand-accent flex-shrink-0" 
            style={{ objectFit: 'contain' }}
          />
          <h1 className="pmo-title text-3xl font-extrabold tracking-tight">
            PMOMAX
          </h1>
          <span className="hidden md:block text-xl font-light text-brand-text-secondary -mb-2">
            PID Architect
          </span>
        </div>

        {/* Center: spacer */}
        <div className="flex-1" />

        {/* Right: Katalyst Street branding and controls */}
        <div className="flex items-center gap-6">
          <a
            href="https://pmoagent.katalyststreet.com/"
            target="_blank"
            rel="noreferrer"
            className="pmomax-gold-button text-sm px-3 py-1.5"
            aria-label="Open PMO Agent website"
          >
            WEBSITE
          </a>
          <div className="hidden sm:flex items-center gap-3 text-brand-text-secondary text-lg">
            <span className="text-base">Built by</span>
            <KatalystIcon 
              className="w-12 h-12 object-contain flex-shrink-0" 
              style={{ objectFit: 'contain' }}
            />
            <span className="font-extrabold text-2xl text-brand-text tracking-wide">
              Katalyst Street
            </span>
          </div>

          <button
            onClick={onHelp}
            className="pmomax-gold-button text-sm px-3 py-1.5"
            aria-label="Open help"
          >
            Help
          </button>

          <button
            onClick={onUserGuide}
            className="pmomax-gold-button text-sm px-3 py-1.5 flex items-center gap-2 max-w-[160px] justify-center"
            aria-label="Open user guide"
          >
            <BookIcon className="w-6 h-6 text-brand-accent" />
            User Guide
          </button>

          <ContactUsButton />

          {/* NAV PANEL: Mobile Toggle */}
          <button
            onClick={onNavToggle}
            className="lg:hidden p-2 rounded-md text-brand-text-secondary hover:bg-brand-border hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            aria-label="Toggle navigation panel"
          >
            <NavIcon className="w-7 h-7" />
          </button>
        </div>
      </header>
    );
  }
);
