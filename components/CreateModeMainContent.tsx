import React from 'react';
import MainContent from './MainContent';
import type { PMOMaxPID } from '../types';

interface CreateModeMainContentProps {
  pidData: PMOMaxPID | null;
  onHelp?: (context?: string) => void;
  showAllSections?: boolean;
}

const CreateModeMainContent: React.FC<CreateModeMainContentProps> = ({ pidData, onHelp, showAllSections }) => (
  <MainContent pidData={pidData} onHelp={onHelp} showAllSections={showAllSections} />
);

export default CreateModeMainContent;
