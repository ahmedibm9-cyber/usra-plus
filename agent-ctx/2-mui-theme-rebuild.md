# Task 2: MUI Theme Rebuild with Enterprise MD3 Standards

## Agent
MUI Theme Rebuild Agent

## Summary
Completely rebuilt `/home/z/my-project/src/lib/mui-theme.ts` from 466 lines to ~680 lines following true Google Material Design 3 standards.

## Key Changes

### Design Tokens Added
- **SPACING**: 8px grid system with 14 steps (0→96px)
- **ELEVATION**: MD3 system with 5 levels (proper rgba shadows)
- **MOTION**: 3 durations (150/300/500ms) + 3 easings
- **SHAPE**: MD3 shape tokens (button=8px, card=12px, dialog=16px, etc.)

### Typography Scale (14 levels)
display2→display1→headline1→headline2→title1→title2→title3→body1→body2→label1→label2→caption→overline

### Component Overrides (28+ components)
Full MD3 overrides for: Button, Card, Paper, TextField, Dialog, Menu, Drawer, AppBar, Tabs, Chip, Avatar, IconButton, ListItemButton, Tooltip, Fab, Snackbar, Alert, Breadcrumbs, Badge, Switch, Progress, Skeleton, Divider, Grid, Stack, Container, Popover, List, InputBase, ButtonBase, CssBaseline

### Dark Theme Specifics
- Semi-transparent paper: `rgba(43, 41, 48, 0.92)`
- Low-alpha shadows (0.20-0.32 range)
- No hardcoded colors — all palette-token-based
- Explicit tooltip/dialog/menu/popover borders

### Architecture
- `sharedComponents()` function for DRY mode-agnostic overrides
- Dark theme only overrides what differs (shadows, borders, specific colors)
- `transition()` helper using MOTION tokens
- `spacing: (factor) => factor * 8 + 'px'` for 8px grid

## Verification
- `bun run lint` → 0 errors
- Dev server → HTTP 200

## Exports
`lightTheme, darkTheme, getAppTheme, SPACING, ELEVATION, MOTION, TEAL, EMERALD, NEUTRAL`
