# WealthStream Admin Panel — Premium UI Redesign

## Current State
- Admin panel is rendered via `AdminPage.tsx` inside `App.tsx`
- The BottomNav (user app tabs: Home, Portfolio, Add Funds, History, Account, Admin) is still visible when the admin panel is active, making it look like a mobile user app
- Admin panel UI uses mobile-style card layouts with large rounded corners, emoji icons, full-width buttons, and visual styling that matches the user app (glassmorphism, large tap targets)
- The sidebar exists but collapses/expands with basic arrows
- Dashboard stats use emoji icons and rounded cards that feel consumer-grade

## Requested Changes (Diff)

### Add
- Full-screen enterprise admin layout: completely separate from user app shell
- Top header bar: logo/brand on left, admin badge, refresh button, logout/back button on right
- Proper sidebar with professional SVG-style icon text glyphs (no emoji), active indicator as left border accent
- Professional stat cards with border-top accent color, clean typography, trend indicators
- Proper HTML tables with thead/tbody for deposits, withdrawals, users, security forensics — replacing mobile-style card lists
- Admin header shows section title + breadcrumb on each page
- Subtle grid/dot background pattern to distinguish admin from user app

### Modify
- `App.tsx`: Hide BottomNav completely when `activeTab === 'admin'` — admin panel must be fully separate from user app navigation
- `AdminPage.tsx`: Complete visual redesign — enterprise dark SaaS aesthetic (charcoal/slate tones, not the glassmorphism consumer dark of the user app)
  - Sidebar: 256px fixed width, always visible on desktop. Clean list items with left-border active indicator
  - Header: fixed top bar, 56px height, company name + "Admin Command Center" subtitle
  - Content: scrollable main area with proper page headers (title + description + action button)
  - Stat cards: flat design, accent border on top, large number, label, subtle trend text — no emoji
  - Data tables: alternating row shading, status badges with dot indicators, action buttons inline
  - PIN screen: centered card with professional form design, no emoji background
  - Buttons: rectangular with subtle radius (8px), not large mobile rounded (16-20px)
  - Typography: smaller, denser — professional admin density, not mobile-first sizing

### Remove
- BottomNav visibility in admin panel view (App.tsx change)
- All emoji used as primary UI icons in admin panel (replace with text glyphs or unicode symbols used sparingly)
- Mobile-style full-width large rounded buttons on every row
- Glassmorphism cards that look like the user app
- `sidebarCollapsed` mobile-collapse button (keep sidebar always open on admin)

## Implementation Plan
1. Edit `App.tsx`: Wrap BottomNav in a conditional — only render when `activeTab !== 'admin'`
2. Redesign `AdminPage.tsx` PIN screen: Clean centered card, professional form
3. Redesign sidebar: Fixed 256px, slate-900 background, left-border active indicator, clean nav items
4. Redesign top header bar: Fixed 56px bar spanning full width, above content
5. Redesign Dashboard tab: Stat cards with top accent border, recent transactions as a proper table
6. Redesign User Directory: HTML table layout, inline expand for user details
7. Redesign Payment Approvals & Withdrawal Queue: Table with status dots, action buttons in last column
8. Redesign Security Alerts: Clean table-based forensics layout
9. Redesign System Settings: Standard form layout with field groups and section dividers
