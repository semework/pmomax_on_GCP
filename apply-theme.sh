#!/bin/bash
# Apply full Obsidian + Gold theme

cd "$(dirname "$0")"

echo "=== Applying Full Design System Theme ==="

# Update CreateMode chat bubbles - replace old styling with design system
echo "Updating CreateMode chat messages..."
sed -i.theme 's/border-slate-700\/70 bg-black\/30 text-slate-100//' components/CreateMode.tsx
sed -i.theme 's/border-amber-400\/40 bg-black\/60 text-amber-100//' components/CreateMode.tsx

# Update LeftSidebar buttons
echo "Updating LeftSidebar buttons..."
sed -i.theme 's/bg-amber-500 hover:bg-amber-400/btn-primary/g' components/LeftSidebar.tsx
sed -i.theme 's/bg-purple-600 hover:bg-purple-500/btn-secondary/g' components/LeftSidebar.tsx
sed -i.theme 's/bg-blue-600 hover:bg-blue-500/btn-secondary/g' components/LeftSidebar.tsx
sed -i.theme 's/bg-red-600 hover:bg-red-500/btn-tertiary/g' components/LeftSidebar.tsx

# Update MainContent intro
echo "Updating MainContent..."
sed -i.theme 's/bg-slate-800/bg-[var(--color-bg-panel)]/g' components/MainContent.tsx
sed -i.theme 's/border-slate-700/border-[var(--color-border)]/g' components/MainContent.tsx

# Update AIAssistantPanel
echo "Updating AIAssistantPanel..."
sed -i.theme 's/bg-slate-900/bg-[var(--color-bg-panel-2)]/g' components/AIAssistantPanel.tsx

echo "✅ Theme updates applied!"
echo "Check components and reload browser to see changes"
