#!/usr/bin/env bash

# ==============================================================================
# MENOMAP FEATURES - QUICK START SETUP
# ==============================================================================
# 
# This script will help you complete the implementation.
# Run this in your MenoMap project directory.
# 
# Usage: bash QUICK_START.sh
# ==============================================================================

echo "🚀 MenoMap Features Quick Start..."
echo ""

# Check if we're in the right directory
if [ ! -f package.json ]; then
  echo "❌ Error: package.json not found. Please run from MenoMap root directory."
  exit 1
fi

echo "✅ Found package.json - you're in the right place!"
echo ""

# Step 1: Fix the corrupted cycle-calendar.tsx
echo "📝 Step 1: Fixing cycle-calendar.tsx..."
if [ -f components/cycle-calendar-fixed.tsx ]; then
  cp components/cycle-calendar-fixed.tsx components/cycle-calendar.tsx
  echo "✅ cycle-calendar.tsx restored from fixed version"
else
  echo "⚠️  cycle-calendar-fixed.tsx not found. Please manually replace cycle-calendar.tsx"
  echo "   Copy the code from IMPLEMENTATION_GUIDE.md"
fi
echo ""

# Step 2: Verify all new files exist
echo "🔍 Step 2: Verifying new files..."
files=(
  "components/chat-widget.tsx"
  "components/track-modal.tsx"
  "hooks/use-daily-logs.ts"
  "app/api/chat/route.ts"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
    all_exist=false
  fi
done
echo ""

if [ "$all_exist" = true ]; then
  echo "✅ All required files exist!"
else
  echo "⚠️  Some files are missing. Please check IMPLEMENTATION_GUIDE.md"
fi
echo ""

# Step 3: Check app/layout.tsx has ChatWidget
echo "🔍 Step 3: Verifying ChatWidget in layout.tsx..."
if grep -q "ChatWidget" app/layout.tsx; then
  echo "✅ ChatWidget imported and used in root layout"
else
  echo "⚠️  ChatWidget not found in app/layout.tsx"
  echo "   Make sure to add: import { ChatWidget } from '@/components/chat-widget'"
  echo "   And add <ChatWidget /> in the body"
fi
echo ""

# Step 4: Verify API routes have new endpoints
echo "🔍 Step 4: Verifying API routes..."
if [ -d "app/api/logs" ]; then
  if grep -q "isPeriodStart" app/api/logs/route.ts; then
    echo "✅ Period start handling in logs API"
  fi
fi

if [ -f "app/api/chat/route.ts" ]; then
  echo "✅ Chat API endpoint exists"
fi
echo ""

# Step 5: Database check
echo "🗄️  Step 5: Database verification..."
echo "  To verify database is working, run:"
echo "  npx prisma db push"
echo ""

# Step 6: Ready to run
echo "🎉 Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. If cycle-calendar.tsx is still corrupted:"
echo "   - Delete it: rm components/cycle-calendar.tsx"
echo "   - Copy from fixed: cp components/cycle-calendar-fixed.tsx components/cycle-calendar.tsx"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Test the features:"
echo "   → Chat widget in bottom-right corner"
echo "   → Click calendar dates to track"
echo "   → Mark period start to reset cycle"
echo ""
echo "4. Check database:"
echo "   npx prisma studio"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation:"
echo "   - IMPLEMENTATION_GUIDE.md - Complete code reference"
echo "   - FEATURES_IMPLEMENTATION_SUMMARY.md - Full feature documentation"
echo "   - This file: QUICK_START.sh"
echo ""
echo "✅ All set! Run 'npm run dev' to start"
echo ""
