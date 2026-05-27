
import React from 'react';
import { PMOMaxIcon } from './Icons';

interface LoadingOverlayProps {
 isExporting?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isExporting = false }) => {
 const title = isExporting ? "Generating Document..." : "AI is architecting...";
 const subtitle = isExporting ? "Please wait while we create your export file." : "Please wait while we structure your document.";

 return (
 <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
 <PMOMaxIcon className="h-16 w-auto text-brand-accent animate-pulse" />
 <h2 className="mt-6 text-2xl font-bold text-white">{title}</h2>
 <p className="mt-2 text-brand-text-secondary">{subtitle}</p>
 </div>
 );
};
