# Task 2 - MUI Header Rebuild Agent

## Summary
Completely rebuilt `/home/z/my-project/src/components/layout/app-header.tsx` using actual MUI (Material UI) components, replacing all shadcn/ui imports.

## Changes Made

### Replaced shadcn/ui → MUI Components
| shadcn/ui Component | MUI Replacement |
|---|---|
| `<header>` div | `<AppBar position="sticky">` + `<Toolbar>` |
| `<Button variant="ghost">` | `<IconButton>` |
| `<DropdownMenu>` | `<Menu>` |
| `<DropdownMenuContent>` | `<Menu slotProps.paper>` with glassStyles |
| `<DropdownMenuItem>` | `<MenuItem>` + `<ListItemIcon>` + `<ListItemText>` |
| `<DropdownMenuSeparator>` | `<Divider>` |
| `<DropdownMenuLabel>` | `<Box>` + `<Typography>` |
| `<Avatar>` (shadcn) | `<Avatar>` (MUI) |
| `<Breadcrumb>` (shadcn) | `<Breadcrumbs>` (MUI) |
| `<Tooltip>` (shadcn) | `<Tooltip>` (MUI) |
| `<kbd>` search shortcut | MUI `<Box>` + `<InputBase>` |

### MUI Icons Used
- `MenuIcon`, `SearchIcon`, `LogoutIcon`, `SettingsIcon`
- `PersonIcon`, `ChevronRightIcon`, `LightModeIcon`, `DarkModeIcon`, `TranslateIcon`

### Key Design Decisions
1. **Glass morphism header**: AppBar with `rgba` background + `backdropFilter: blur(20px) saturate(180%)`
2. **Profile dropdown**: MUI Menu with `glassStyles` from `@/lib/mui/theme` - opaque frosted glass
3. **No red/yellow colors**: Logout uses muted tones, primary accent is teal/emerald (#0D6B58 / #6EE7B7)
4. **Theme-aware**: Uses `useTheme()` from MUI, reads `isDark` for conditional styling
5. **Responsive**: MUI `sx` breakpoints for mobile/desktop layout differences

## Verification
- Lint: 0 errors, 0 warnings
- Dev server: running successfully
- All functionality preserved (breadcrumb, search, theme toggle, language, notifications, profile dropdown)
