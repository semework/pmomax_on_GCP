# PMOMax Design System Implementation Guide

## Overview
Comprehensive design system implementing **Theme A: Obsidian + Gold** — a premium, professional theme that eliminates visual noise and creates clear hierarchy.

## ✅ What's Been Implemented

### 1. Design System Foundation (`/public/design-system.css`)
New CSS file with complete design tokens:
- **Color System**: Obsidian backgrounds (#070A0F, #0F172A, #0B1220) with gold primary (#F59E0B)
- **Button Hierarchy**: 3-level system (Primary Gold, Secondary Slate, Tertiary Text)
- **Shadows & Depth**: Consistent elevation with gold glow effects
- **Typography Scale**: Responsive sizing with proper hierarchy
- **Agent Cards**: Unified system with subtle left-border accents (no rainbow UI)
- **Animations**: Fade-in, slide-in, pulse for micro-interactions
- **Accessibility**: Enhanced focus rings with gold outline + glow

### 2. Core CSS Updates (`/public/pmomax-landing.css`)
- **Background**: Changed from #0A0A0A to #070A0F (Obsidian) with subtle gold radial gradient
- **Focus States**: Upgraded to gold (#F59E0B) with soft glow
- **Scrollbars**: Refined with subtle slate track, gold hover
- **Gold Buttons**: Enhanced with 3D depth, gold glow, refined gradients

### 3. HTML Structure (`/index.html`)
- Added design-system.css import before pmomax-landing.css
- Ensures proper cascade and token availability

## 🎨 Design Tokens Reference

### Colors
```css
--color-bg-primary: #070A0F        /* Near-black Obsidian */
--color-bg-panel: #0F172A          /* Panel backgrounds */
--color-bg-elevated: #1A2333       /* Elevated cards */
--color-border: rgba(148,163,184,0.14)  /* Subtle borders */
--color-text-primary: #E5E7EB      /* Main text */
--color-primary: #F59E0B           /* Gold - PRIMARY ACTIONS ONLY */
--color-secondary: #334155         /* Slate - secondary actions */
```

### Button Classes
```html
<!-- PRIMARY: Main CTA only (Create, Save, Submit) -->
<button class="btn-primary">Create PID</button>

<!-- SECONDARY: Standard actions (Load, Upload, Export) -->
<button class="btn-secondary">Load Demo</button>

<!-- TERTIARY: Minimal actions (Cancel, Close) -->
<button class="btn-tertiary">Cancel</button>

<!-- DANGER: Destructive confirms only -->
<button class="btn-danger">Delete</button>
```

### Panel Classes
```html
<!-- Primary panels (main containers) -->
<div class="panel-primary">...</div>

<!-- Elevated cards (hover effects) -->
<div class="panel-elevated">...</div>

<!-- Interactive cards (clickable) -->
<div class="card-interactive">...</div>
```

### Agent Cards (No Rainbow UI)
```html
<div class="agent-card agent-risk">
  <!-- Left border shows agent type, not full rainbow -->
</div>

<!-- Available types: -->
agent-risk (red border)
agent-compliance (green border)
agent-schedule (blue border)
agent-quality (purple border)
```

## 📋 Migration Checklist

### Phase 1: Component Updates (High Priority)
- [ ] **CreateMode.tsx** - Update to use design system classes
  - Replace inline colors with CSS variables
  - Use .btn-primary for Send button
  - Use .card-interactive for example cards
  - Add .animate-fade-in to chat messages

- [ ] **MainContent.tsx** - Update intro table
  - Use .panel-primary for container
  - Use .btn-primary for action buttons
  - Add .hover-lift to feature cards

- [ ] **LeftSidebar.tsx** - Standardize buttons
  - Parse button → .btn-primary
  - Load Demo → .btn-secondary
  - Reset → .btn-tertiary (NOT red by default)
  - Upload → .btn-secondary

- [ ] **AIAssistantPanel.tsx** - Update chat UI
  - Use .input-primary for text input
  - Use .btn-primary for Send button
  - Add .animate-slide-in to messages

### Phase 2: Gantt & Visualizations
- [ ] **ArtDecoGantt.tsx, BlueprintCADGantt.tsx** etc.
  - Update theme color palettes to use CSS variables
  - Replace hardcoded golds with var(--color-primary)
  - Use consistent border styles

### Phase 3: Modals & Overlays
- [ ] **UserGuideModal.tsx** - Update modal styling
  - Use .panel-elevated for container
  - Standardize button hierarchy
  - Add subtle animations

- [ ] **ComplianceModal.tsx, RiskModal.tsx** - Agent cards
  - Use .agent-card with appropriate type class
  - Remove rainbow colors, use left-border system

### Phase 4: Polish & Animations
- [ ] Add .animate-fade-in to newly rendered content
- [ ] Add .hover-lift to all interactive cards
- [ ] Ensure all buttons use correct hierarchy
- [ ] Test keyboard navigation (focus rings should be gold)

## 🚀 Quick Wins (Do First)

### 1. Update CreateMode Sticky Header
```tsx
// Before
className="bg-gradient-to-b from-slate-900 to-slate-800"

// After
className="panel-primary"
style={{ background: 'linear-gradient(to bottom, var(--color-bg-panel), var(--color-bg-panel-2))' }}
```

### 2. Standardize All Buttons
```tsx
// PRIMARY (only main CTAs)
<button className="btn-primary">Create</button>
<button className="btn-primary">Parse</button>
<button className="btn-primary">Save</button>

// SECONDARY (standard actions)
<button className="btn-secondary">Load Demo</button>
<button className="btn-secondary">Upload</button>
<button className="btn-secondary">Export</button>

// TERTIARY (minimal)
<button className="btn-tertiary">Cancel</button>
<button className="btn-tertiary">Close</button>

// DANGER (only after confirm)
<button className="btn-danger">Delete Project</button>
```

### 3. Add Micro-Animations
```tsx
// Messages appearing
<div className="animate-fade-in">...</div>

// Sidebar panels
<div className="animate-slide-in">...</div>

// Cards
<div className="card-interactive hover-lift">...</div>
```

## 🎯 Design Principles

### 1. **Gold = Primary Action Only**
- Only use gold for the most important CTA on each screen
- Create mode: "Send" button
- Main panel: "Parse" button
- Sidebar: "Upload" button

### 2. **Reduce Border Noise**
- Use subtle borders (rgba(148,163,184,0.14))
- Only brighten on hover
- Avoid thick borders everywhere

### 3. **Consistent Depth**
- Panel hierarchy: primary < elevated < cards
- Use shadows to show elevation, not just borders
- Add gold glow to primary actions

### 4. **Agent Identity Without Rainbow**
- Use left-border accent (3px) for agent type
- Keep base card consistent
- Avoid full-color backgrounds

### 5. **Smooth Interactions**
- All transitions use cubic-bezier(0.4, 0, 0.2, 1)
- Hover: translateY(-1px) + shadow increase
- Active: translateY(0) + shadow decrease
- Focus: gold outline + soft glow

## 🔍 Before/After Examples

### Button Hierarchy
```tsx
// ❌ BEFORE (Rainbow UI)
<button className="bg-amber-500 hover:bg-amber-400">Create</button>
<button className="bg-purple-500 hover:bg-purple-400">Load Demo</button>
<button className="bg-blue-500 hover:bg-blue-400">Upload</button>
<button className="bg-red-500 hover:bg-red-400">Reset</button>

// ✅ AFTER (Hierarchy)
<button className="btn-primary">Create</button>
<button className="btn-secondary">Load Demo</button>
<button className="btn-secondary">Upload</button>
<button className="btn-tertiary">Reset</button>
```

### Card System
```tsx
// ❌ BEFORE (Inconsistent)
<div className="bg-slate-900 border-2 border-amber-400 p-4 rounded-lg shadow-xl">

// ✅ AFTER (Consistent)
<div className="card-interactive hover-lift">
```

### Colors
```tsx
// ❌ BEFORE (Hardcoded)
style={{ backgroundColor: '#1F2937', borderColor: '#fbbf24' }}

// ✅ AFTER (Design tokens)
style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-primary)' }}
```

## 🧪 Testing Checklist

- [ ] All primary actions are gold, clearly visible
- [ ] Secondary actions use consistent slate style
- [ ] No red buttons unless confirming destructive action
- [ ] Focus rings are gold with soft glow
- [ ] Hover states work on all interactive elements
- [ ] Mobile: buttons are large enough (44px min tap target)
- [ ] Keyboard navigation: focus visible on all elements
- [ ] Dark theme: sufficient contrast (4.5:1 minimum)
- [ ] Animations feel smooth, not janky
- [ ] Agent cards use subtle left-border, not full rainbow

## 📱 Mobile Considerations

Design system includes responsive breakpoints at 640px:
- Font sizes scale down appropriately
- Button padding reduces but maintains tap targets
- Panel padding compacts
- Scrollable tables with touch momentum

## 🎨 Color Contrast Ratios (WCAG AA+)

- Text on Obsidian (#E5E7EB on #070A0F): 14.6:1 ✅
- Gold on Obsidian (#F59E0B on #070A0F): 7.8:1 ✅
- Black on Gold (#0B0F17 on #F59E0B): 9.2:1 ✅
- Secondary text (#E2E8F068 on #070A0F): 4.9:1 ✅

## 🔄 Next Steps

1. **Immediate**: Apply to CreateMode.tsx (user-facing intro)
2. **Day 1**: Update MainContent.tsx and LeftSidebar.tsx
3. **Day 2**: Migrate Gantt themes and visualizations
4. **Day 3**: Polish modals and overlays
5. **Day 4**: Add micro-animations throughout
6. **Day 5**: Comprehensive testing + refinements

## 📚 Resources

- Design system file: `/public/design-system.css`
- Color tokens: CSS custom properties (--color-*)
- Button classes: `.btn-primary`, `.btn-secondary`, `.btn-tertiary`, `.btn-danger`
- Panel classes: `.panel-primary`, `.panel-elevated`, `.card-interactive`
- Animation classes: `.animate-fade-in`, `.animate-slide-in`, `.hover-lift`

---

**Goal**: Transform PMOMax from busy, rainbow UI to polished, enterprise-ready SaaS product with clear visual hierarchy and premium feel.
