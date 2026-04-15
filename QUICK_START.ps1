# ==============================================================================
# MENOMAP FEATURES - QUICK START SETUP (Windows PowerShell)
# ==============================================================================
# 
# This script will help you complete the implementation.
# Run this in your MenoMap project directory.
# 
# Usage: .\QUICK_START.ps1
# ==============================================================================

Write-Host "🚀 MenoMap Features Quick Start..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run from MenoMap root directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found package.json - you're in the right place!" -ForegroundColor Green
Write-Host ""

# Step 1: Fix the corrupted cycle-calendar.tsx
Write-Host "📝 Step 1: Fixing cycle-calendar.tsx..." -ForegroundColor Yellow
if (Test-Path "components/cycle-calendar-fixed.tsx") {
    Copy-Item "components/cycle-calendar-fixed.tsx" "components/cycle-calendar.tsx" -Force
    Write-Host "✅ cycle-calendar.tsx restored from fixed version" -ForegroundColor Green
} else {
    Write-Host "⚠️  cycle-calendar-fixed.tsx not found. Please manually replace cycle-calendar.tsx" -ForegroundColor Yellow
    Write-Host "   Copy the code from IMPLEMENTATION_GUIDE.md"
}
Write-Host ""

# Step 2: Verify all new files exist
Write-Host "🔍 Step 2: Verifying new files..." -ForegroundColor Yellow
$files = @(
    "components/chat-widget.tsx",
    "components/track-modal.tsx",
    "hooks/use-daily-logs.ts",
    "app/api/chat/route.ts"
)

$all_exist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (missing)" -ForegroundColor Red
        $all_exist = $false
    }
}
Write-Host ""

if ($all_exist) {
    Write-Host "✅ All required files exist!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some files are missing. Please check IMPLEMENTATION_GUIDE.md" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check app/layout.tsx has ChatWidget
Write-Host "🔍 Step 3: Verifying ChatWidget in layout.tsx..." -ForegroundColor Yellow
$layoutContent = Get-Content "app/layout.tsx" -Raw
if ($layoutContent -match "ChatWidget") {
    Write-Host "✅ ChatWidget imported and used in root layout" -ForegroundColor Green
} else {
    Write-Host "⚠️  ChatWidget not found in app/layout.tsx" -ForegroundColor Yellow
    Write-Host "   Make sure to add: import { ChatWidget } from '@/components/chat-widget'"
    Write-Host "   And add <ChatWidget /> in the body"
}
Write-Host ""

# Step 4: Verify API routes have new endpoints
Write-Host "🔍 Step 4: Verifying API routes..." -ForegroundColor Yellow
if (Test-Path "app/api/logs/route.ts") {
    $logsContent = Get-Content "app/api/logs/route.ts" -Raw
    if ($logsContent -match "isPeriodStart") {
        Write-Host "✅ Period start handling in logs API" -ForegroundColor Green
    }
}

if (Test-Path "app/api/chat/route.ts") {
    Write-Host "✅ Chat API endpoint exists" -ForegroundColor Green
}
Write-Host ""

# Step 5: Database check
Write-Host "🗄️  Step 5: Database verification..." -ForegroundColor Yellow
Write-Host "  To verify database is working, run:" -ForegroundColor Cyan
Write-Host "  npx prisma db push"
Write-Host ""

# Step 6: Ready to run
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If cycle-calendar.tsx is still corrupted:" -ForegroundColor Yellow
Write-Host "   - Delete it: Remove-Item components/cycle-calendar.tsx"
Write-Host "   - Copy from fixed: Copy-Item components/cycle-calendar-fixed.tsx components/cycle-calendar.tsx"
Write-Host ""
Write-Host "2. Start development server:" -ForegroundColor Yellow
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3. Test the features:" -ForegroundColor Yellow
Write-Host "   → Chat widget in bottom-right corner
   → Click calendar dates to track
   → Mark period start to reset cycle"
Write-Host ""
Write-Host "4. Check database:" -ForegroundColor Yellow
Write-Host "   npx prisma studio"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - IMPLEMENTATION_GUIDE.md - Complete code reference"
Write-Host "   - FEATURES_IMPLEMENTATION_SUMMARY.md - Full feature documentation"
Write-Host "   - QUICK_START.ps1 - This file"
Write-Host ""
Write-Host "✅ All set! Run 'npm run dev' to start" -ForegroundColor Green
Write-Host ""
