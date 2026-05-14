---
Task ID: 3-b
Agent: Layout MUI Rewrite Agent
Task: Rewrite 4 layout component files using ONLY Material UI (MUI) components

Work Log:
- Read worklog.md to understand previous agents' work (Task 1: MD3 redesign, Task 2: Vercel deploy)
- Read all 4 layout component files and related dependencies (stores, types, MUI theme)
- Created new shared MUI ThemeProvider wrapper at src/components/layout/mui-layout-provider.tsx
  - Uses getAppTheme() from src/lib/mui-theme.ts for light/dark mode support
  - Wraps children with MUI ThemeProvider + CssBaseline

- Rewrote src/components/layout/notification-panel.tsx:
  - Replaced shadcn/ui Popover/Badge/ScrollArea/Separator/Button with MUI Popover/Badge/List/ListItem/ListItemText/Typography/Button/Divider/Box/Chip/Tooltip/IconButton
  - Fixed opaque background: Popover paper has `bgcolor: 'background.paper'`, `backgroundImage: 'none'`
  - Replaced all red colors (#E50914) with teal primary color
  - Replaced all yellow/amber alert colors with teal primary
  - Replaced lucide-react icons with @mui/icons-material equivalents
  - Fixed ErrorOutline → Error (not a valid export in MUI v9)
  - Used sx prop for all styling, removed all Tailwind classes
  - Kept all notification logic (realtime, sound, mark as read, categorization, etc.)

- Rewrote src/components/layout/app-header.tsx:
  - Replaced shadcn/ui Button/Avatar/Breadcrumb/DropdownMenu/Tooltip with MUI AppBar/Toolbar/IconButton/Typography/Avatar/Menu/MenuItem/Tooltip/Breadcrumbs/InputBase/Divider/Box
  - AppBar is sticky at top with `position="sticky"`
  - User avatar dropdown menu has OPAQUE background: `bgcolor: 'background.paper'`, `backgroundImage: 'none'`
  - Search bar uses MUI InputBase with sx styling
  - Theme toggle uses LightMode/DarkMode MUI icons
  - Language switcher uses emoji flags
  - Used sx prop for all styling, removed all Tailwind classes

- Rewrote src/components/layout/app-sidebar.tsx:
  - Replaced shadcn/ui Sheet/ScrollArea/Separator/DropdownMenu/Avatar/Button/Tooltip with MUI Drawer/List/ListItem/ListItemButton/ListItemIcon/ListItemText/Avatar/IconButton/Menu/MenuItem/Divider/Box/Typography/Tooltip/ButtonBase
  - Desktop sidebar uses FIXED position (`position: 'fixed'`) so it does NOT scroll with content
  - Collapse toggle button positioned absolutely on the edge
  - Mobile sidebar uses MUI Drawer component
  - Family selector uses ButtonBase + MUI Menu
  - User profile section uses MUI Menu with opaque background
  - Custom PlanBadgeMUI component replacing shadcn-based PlanBadge
  - Used sx prop for all styling, removed all Tailwind classes
  - Fixed MUI v9 compatibility: primaryTypographyProps → sx with '& .MuiListItemText-primary'
  - Fixed srOnly usage (not valid in MUI v9) with clip-based approach

- Rewrote src/components/layout/bottom-nav.tsx:
  - Replaced shadcn/ui Sheet/SheetContent/SheetTrigger with MUI Paper/Drawer/IconButton/Box/Typography/ButtonBase
  - Mobile bottom nav uses MUI Paper with custom ButtonBase items
  - Active pill indicator uses MUI Box with `bgcolor: 'primary.light'`
  - "More" menu uses MUI Drawer (anchor="bottom") with rounded top corners
  - Navigation items in grid layout with MUI ButtonBase
  - Used sx prop for all styling, removed all Tailwind classes
  - Fixed srOnly variant (not valid in MUI v9 Typography)

- Fixed pre-existing MUI v9 compatibility issues across the project:
  - ErrorOutline → Error (not a valid MUI v9 icon) in otp-verification-form.tsx, terms-modal.tsx
  - InputProps → slotProps.input (MUI v9 TextField API change) in login-form.tsx, signup-form.tsx, forgot-password-form.tsx
  - Stack alignItems/justifyContent as direct props → moved to sx prop in login-form.tsx, signup-form.tsx, otp-verification-form.tsx, terms-modal.tsx, dashboard-page.tsx, page.tsx
  - Card variant="filled" → "elevation" (not valid in MUI v9) in dashboard-page.tsx
  - Added missing IconButton import in signup-form.tsx
  - Added missing Button import in family-analytics-widget.tsx
  - Removed duplicate borderColor property in signup-form.tsx

- All lint checks pass (0 errors, 0 warnings)
- Build passes successfully (next build completes with no type errors)

Stage Summary:
- All 4 layout component files fully rewritten using ONLY MUI components
- Zero shadcn/ui imports remain in these files
- All styling uses sx prop (no Tailwind classes)
- All lucide-react icons replaced with @mui/icons-material equivalents
- All red/yellow colors replaced with teal primary
- All dropdown menus have opaque backgrounds (critical fix)
- Sidebar is fixed position (critical fix)
- Pre-existing MUI v9 compatibility issues fixed across 10+ files
- Build and lint both pass cleanly
