# PMOMax PID Architect - Data Structure Guide

## Overview

This document provides comprehensive documentation of all data structures, interfaces, types, and their relationships in the PMOMax PID Architect application. Understanding these structures is essential for development, integration, and data management.

## Core Data Model

### PidData Interface

The `PidData` interface is the central data structure that represents a complete Project Initiation Document.

```typescript
interface PidData {
  // Metadata
  lastModified: string;          // ISO 8601 timestamp
  version: string;                // Semantic version (e.g., "1.0.16")
  createdDate: string;            // ISO 8601 timestamp
  
  // Section 1: Project Overview
  projectTitle: string;
  projectDescription: string;
  projectObjectives: string;
  businessCase: string;
  keyStakeholders: string;
  
  // Section 2: Scope & Deliverables
  scopeInScope: string;
  scopeOutOfScope: string;
  deliverables: DeliverableItem[];
  acceptanceCriteria: string;
  
  // Section 3: Schedule & Milestones
  projectTimeline: string;
  milestones: MilestoneItem[];
  criticalPath: string;
  ganttData: GanttPhase[];
  
  // Section 4: Resources & Budget
  teamStructure: string;
  resourceAllocation: ResourceItem[];
  budgetBreakdown: BudgetItem[];
  costTracking: string;
  
  // Section 5: Risk Management
  risks: RiskItem[];
  riskMatrix: string;
  mitigationStrategies: string;
  
  // Section 6: Communication Plan
  stakeholderComm: StakeholderCommItem[];
  meetingSchedule: string;
  reportingStructure: string;
  
  // Section 7: Quality & Change Control
  qualityAssurance: string;
  testingProcedures: string;
  changeControl: string;
  versionControl: string;
  
  // Additional metadata
  generalNotes: string;
}
```

## Section-Specific Data Structures

### Section 2: Deliverables

```typescript
interface DeliverableItem {
  id: string;                    // Unique identifier (UUID v4)
  name: string;                  // Deliverable name
  description: string;           // Detailed description
  dueDate: string;               // ISO 8601 date string
  owner: string;                 // Person/team responsible
  status: DeliverableStatus;     // Current status
}

type DeliverableStatus = 
  | 'Not Started'
  | 'In Progress'
  | 'In Review'
  | 'Completed'
  | 'Blocked';

// Example
const deliverable: DeliverableItem = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "System Architecture Document",
  description: "Comprehensive technical architecture specification",
  dueDate: "2025-12-31",
  owner: "Tech Lead",
  status: "In Progress"
};
```

### Section 3: Milestones & Gantt

#### Milestone Structure

```typescript
interface MilestoneItem {
  id: string;                    // Unique identifier
  name: string;                  // Milestone name
  date: string;                  // Target date (ISO 8601)
  description: string;           // Milestone description
  dependencies: string[];        // IDs of dependent milestones
  status: MilestoneStatus;       // Current status
}

type MilestoneStatus = 
  | 'Upcoming'
  | 'In Progress'
  | 'Achieved'
  | 'At Risk'
  | 'Missed';
```

#### Gantt Chart Structure

```typescript
interface GanttPhase {
  id: string;                    // Unique identifier
  name: string;                  // Phase name
  startDate: string;             // ISO 8601 date
  endDate: string;               // ISO 8601 date
  progress: number;              // 0-100 percentage
  color: string;                 // Hex color code
  tasks: GanttTask[];           // Array of sub-tasks
  dependencies: string[];        // IDs of dependent phases
}

interface GanttTask {
  id: string;                    // Unique identifier
  name: string;                  // Task name
  startDate: string;             // ISO 8601 date
  endDate: string;               // ISO 8601 date
  progress: number;              // 0-100 percentage
  assignee: string;              // Person/team assigned
  dependencies: string[];        // IDs of dependent tasks
  status: TaskStatus;            // Current status
}

type TaskStatus = 
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Blocked'
  | 'On Hold';

// Example
const phase: GanttPhase = {
  id: "phase-1",
  name: "Planning & Design",
  startDate: "2025-01-01",
  endDate: "2025-03-31",
  progress: 65,
  color: "#3B82F6",
  tasks: [
    {
      id: "task-1",
      name: "Requirements Gathering",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      progress: 100,
      assignee: "Business Analyst",
      dependencies: [],
      status: "Completed"
    },
    {
      id: "task-2",
      name: "Architecture Design",
      startDate: "2025-02-01",
      endDate: "2025-03-15",
      progress: 50,
      assignee: "Solution Architect",
      dependencies: ["task-1"],
      status: "In Progress"
    }
  ],
  dependencies: []
};
```

### Section 4: Resources & Budget

#### Resource Structure

```typescript
interface ResourceItem {
  id: string;                    // Unique identifier
  name: string;                  // Resource name/person
  role: string;                  // Role/title
  allocation: number;            // Percentage (0-100)
  startDate: string;             // ISO 8601 date
  endDate: string;               // ISO 8601 date
  cost: number;                  // Cost per period
  costPeriod: CostPeriod;        // Period unit
}

type CostPeriod = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

// Example
const resource: ResourceItem = {
  id: "res-1",
  name: "John Doe",
  role: "Senior Developer",
  allocation: 100,
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  cost: 75,
  costPeriod: "hourly"
};
```

#### Budget Structure

```typescript
interface BudgetItem {
  id: string;                    // Unique identifier
  category: BudgetCategory;      // Budget category
  item: string;                  // Item description
  planned: number;               // Planned cost
  actual: number;                // Actual cost
  variance: number;              // Calculated: actual - planned
  notes: string;                 // Additional notes
}

type BudgetCategory = 
  | 'Personnel'
  | 'Equipment'
  | 'Software'
  | 'Training'
  | 'Travel'
  | 'Consulting'
  | 'Contingency'
  | 'Other';

// Example
const budgetItem: BudgetItem = {
  id: "budget-1",
  category: "Software",
  item: "Cloud Infrastructure",
  planned: 50000,
  actual: 48000,
  variance: -2000,
  notes: "Savings from negotiated rates"
};
```

### Section 5: Risk Management

```typescript
interface RiskItem {
  id: string;                    // Unique identifier
  description: string;           // Risk description
  category: RiskCategory;        // Risk category
  probability: RiskLevel;        // Likelihood (1-5)
  impact: RiskLevel;             // Severity (1-5)
  score: number;                 // Calculated: probability × impact
  mitigation: string;            // Mitigation strategy
  owner: string;                 // Risk owner
  status: RiskStatus;            // Current status
}

type RiskCategory = 
  | 'Technical'
  | 'Resource'
  | 'Schedule'
  | 'Budget'
  | 'Stakeholder'
  | 'External'
  | 'Legal'
  | 'Operational';

type RiskLevel = 1 | 2 | 3 | 4 | 5;

type RiskStatus = 
  | 'Identified'
  | 'Monitoring'
  | 'Mitigating'
  | 'Resolved'
  | 'Materialized';

// Example
const risk: RiskItem = {
  id: "risk-1",
  description: "Key developer may leave project",
  category: "Resource",
  probability: 3,
  impact: 4,
  score: 12,
  mitigation: "Cross-training, documentation, backup resources",
  owner: "Project Manager",
  status: "Monitoring"
};

// Risk Matrix Calculation
function calculateRiskScore(probability: RiskLevel, impact: RiskLevel): number {
  return probability * impact;
}

function getRiskSeverity(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score <= 5) return 'Low';
  if (score <= 10) return 'Medium';
  if (score <= 15) return 'High';
  return 'Critical';
}
```

### Section 6: Communication Plan

```typescript
interface StakeholderCommItem {
  id: string;                    // Unique identifier
  stakeholder: string;           // Stakeholder name/group
  role: string;                  // Their role in project
  interest: StakeholderInterest; // Level of interest
  influence: StakeholderInfluence; // Level of influence
  commMethod: CommunicationMethod; // Preferred method
  frequency: CommunicationFrequency; // Update frequency
  notes: string;                 // Additional notes
}

type StakeholderInterest = 'Low' | 'Medium' | 'High';
type StakeholderInfluence = 'Low' | 'Medium' | 'High';

type CommunicationMethod = 
  | 'Email'
  | 'Meeting'
  | 'Phone'
  | 'Dashboard'
  | 'Report'
  | 'Presentation'
  | 'Slack/Teams';

type CommunicationFrequency = 
  | 'Daily'
  | 'Weekly'
  | 'Bi-weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'As Needed'
  | 'Milestone-based';

// Example
const stakeholderComm: StakeholderCommItem = {
  id: "comm-1",
  stakeholder: "Executive Sponsor",
  role: "Project Sponsor",
  interest: "High",
  influence: "High",
  commMethod: "Presentation",
  frequency: "Monthly",
  notes: "Prefers executive summary format"
};
```

## UI Component Props

### Table Component Props

```typescript
interface TableProps<T> {
  data: T[];                     // Array of data items
  columns: ColumnDef<T>[];       // Column definitions
  onAdd?: () => void;            // Add row handler
  onEdit?: (item: T) => void;    // Edit row handler
  onDelete?: (id: string) => void; // Delete row handler
  sortable?: boolean;            // Enable sorting
  filterable?: boolean;          // Enable filtering
  exportable?: boolean;          // Enable export
}

interface ColumnDef<T> {
  key: keyof T;                  // Property key
  label: string;                 // Column header
  type: FieldType;               // Data type
  sortable?: boolean;            // Column sortable
  width?: string;                // Column width
  render?: (value: any, row: T) => React.ReactNode; // Custom renderer
}

type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'email'
  | 'url';
```

### Gantt Chart Props

```typescript
interface GanttChartProps {
  phases: GanttPhase[];          // Array of phases
  viewMode: GanttViewMode;       // Current view mode
  onPhaseClick?: (phase: GanttPhase) => void; // Phase click handler
  onTaskClick?: (task: GanttTask) => void; // Task click handler
  onDateChange?: (id: string, startDate: string, endDate: string) => void;
  editable?: boolean;            // Enable editing
  showDependencies?: boolean;    // Show dependency lines
}

type GanttViewMode = 
  | 'high-level'
  | 'detailed'
  | 'resource-focused'
  | 'milestone-view';

// Preset configurations
interface GanttPreset {
  name: string;
  viewMode: GanttViewMode;
  showTasks: boolean;
  showProgress: boolean;
  showDependencies: boolean;
  timeScale: 'day' | 'week' | 'month' | 'quarter';
}
```

## Storage & Persistence

### LocalStorage Schema

```typescript
// Storage keys
const STORAGE_KEYS = {
  PID_DATA: 'pmo-architect-pid-data',
  USER_PREFERENCES: 'pmo-architect-preferences',
  AUTOSAVE_TIMESTAMP: 'pmo-architect-autosave-timestamp',
  DRAFT_STATE: 'pmo-architect-draft'
} as const;

// Stored data structure
interface StoredPidData {
  version: string;               // Data schema version
  timestamp: number;             // Unix timestamp
  data: PidData;                 // Complete PID data
  checksum: string;              // Data integrity hash
}

// User preferences
interface UserPreferences {
  theme: 'light' | 'dark';
  autoSaveInterval: number;      // Milliseconds
  defaultExportFormat: 'pdf' | 'docx' | 'json';
  showWelcomeMessage: boolean;
  ganttDefaultView: GanttViewMode;
  tablePageSize: number;
}
```

### Data Validation

```typescript
// Validation schemas
interface ValidationRule {
  field: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

// Section completion criteria
interface SectionCompletion {
  sectionId: number;
  requiredFields: string[];
  optionalFields: string[];
  completionPercentage: number;
  isComplete: boolean;
}

// Example validation
const projectTitleValidation: ValidationRule = {
  field: 'projectTitle',
  type: 'required',
  message: 'Project title is required'
};

const deliverableValidation: ValidationRule = {
  field: 'deliverables',
  type: 'custom',
  message: 'At least one deliverable is required',
  validator: (value: DeliverableItem[]) => value.length > 0
};
```

## Export Data Formats

### PDF Export Structure

```typescript
interface PdfExportOptions {
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  includeFooters: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  margins: PdfMargins;
  sections: number[];            // Sections to include
}

interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

### DOCX Export Structure

```typescript
interface DocxExportOptions {
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  includeFooters: boolean;
  styles: DocxStyles;
  sections: number[];
}

interface DocxStyles {
  fontFamily: string;
  fontSize: number;
  headingFont: string;
  headingSizes: number[];        // H1-H6 sizes
  lineSpacing: number;
  paragraphSpacing: number;
}
```

### JSON Export Structure

```typescript
interface JsonExport {
  metadata: {
    exportDate: string;          // ISO 8601 timestamp
    version: string;             // App version
    schemaVersion: string;       // Data schema version
    exportedBy: string;          // User identifier
  };
  data: PidData;                 // Complete PID data
  statistics: {
    totalSections: number;
    completedSections: number;
    totalItems: number;
    lastModified: string;
  };
}
```

## API Integration Structures (Future)

### API Request/Response Types

```typescript
// Authentication
interface AuthRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

// PID Operations
interface CreatePidRequest {
  title: string;
  description: string;
  template?: string;
}

interface CreatePidResponse {
  id: string;
  data: PidData;
  createdAt: string;
}

interface UpdatePidRequest {
  id: string;
  data: Partial<PidData>;
}

interface GetPidResponse {
  id: string;
  data: PidData;
  owner: UserProfile;
  collaborators: UserProfile[];
  version: number;
  lastModified: string;
}

// User profile
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
}

type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
```

## Data Relationships & Constraints

### Referential Integrity

```typescript
// Dependencies between entities
interface DataRelationships {
  // Tasks depend on phases
  tasks: {
    phaseId: string;             // Parent phase ID
    taskId: string;              // Task ID
  }[];
  
  // Milestones may depend on other milestones
  milestoneDependencies: {
    milestoneId: string;
    dependsOn: string[];         // Array of milestone IDs
  }[];
  
  // Resources allocated to tasks
  resourceAllocations: {
    resourceId: string;
    taskId: string;
    allocation: number;
  }[];
  
  // Budget items linked to resources
  budgetAllocations: {
    budgetItemId: string;
    resourceId: string;
    amount: number;
  }[];
}
```

### Data Constraints

```typescript
interface DataConstraints {
  // String length limits
  maxLength: {
    projectTitle: 200;
    projectDescription: 5000;
    sectionContent: 10000;
  };
  
  // Numeric limits
  numericRanges: {
    progress: [0, 100];
    allocation: [0, 100];
    riskLevel: [1, 5];
  };
  
  // Date constraints
  dateRules: {
    endDateAfterStartDate: boolean;
    futureDatesOnly: boolean;
  };
  
  // Array size limits
  maxItems: {
    deliverables: 100;
    risks: 50;
    milestones: 50;
    phases: 20;
    tasksPerPhase: 50;
  };
}
```

## Helper Functions & Utilities

### Data Transformation

```typescript
// Convert data for export
function transformForExport(data: PidData): JsonExport {
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      version: APP_VERSION,
      schemaVersion: DATA_SCHEMA_VERSION,
      exportedBy: 'current-user'
    },
    data,
    statistics: calculateStatistics(data)
  };
}

// Calculate completion statistics
function calculateStatistics(data: PidData): Statistics {
  return {
    totalSections: 7,
    completedSections: countCompletedSections(data),
    totalItems: countAllItems(data),
    lastModified: data.lastModified
  };
}

// Validate data structure
function validatePidData(data: unknown): data is PidData {
  // Type guard implementation
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectTitle' in data &&
    'lastModified' in data
    // ... additional checks
  );
}
```

### Data Migration

```typescript
// Schema versioning
interface SchemaVersion {
  version: string;
  migrate: (oldData: any) => PidData;
}

const migrations: SchemaVersion[] = [
  {
    version: '1.0.0',
    migrate: (data) => ({
      ...data,
      version: '1.0.0'
    })
  },
  {
    version: '1.0.16',
    migrate: (data) => ({
      ...data,
      version: '1.0.16',
      // Add new fields with defaults
      ganttData: data.ganttData || []
    })
  }
];

function migrateData(data: any, targetVersion: string): PidData {
  let currentData = data;
  
  for (const migration of migrations) {
    if (versionCompare(data.version, migration.version) < 0) {
      currentData = migration.migrate(currentData);
    }
  }
  
  return currentData;
}
```

## Constants & Enums

```typescript
// App constants
export const APP_VERSION = '1.0.19';
export const DATA_SCHEMA_VERSION = '1.0.0';
export const AUTO_SAVE_INTERVAL = 2000; // milliseconds
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Color constants
export const COLORS = {
  primary: '#2563EB',
  secondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
} as const;

// Status colors
export const STATUS_COLORS: Record<DeliverableStatus, string> = {
  'Not Started': '#9CA3AF',
  'In Progress': '#3B82F6',
  'In Review': '#F59E0B',
  'Completed': '#10B981',
  'Blocked': '#EF4444'
};
```

---

**Version**: 1.0.19  
**Last Updated**: January 2, 2026  
**Schema Version**: 1.0.0
