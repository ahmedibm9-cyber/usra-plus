# Task 3-c: MUI Auth Components Agent

## Task
Rewrite ALL auth component files using ONLY Material UI (MUI) components. Replace ALL shadcn/ui components with MUI equivalents.

## Files Modified
1. `/home/z/my-project/src/components/auth/login-form.tsx` - Full MUI rewrite
2. `/home/z/my-project/src/components/auth/signup-form.tsx` - Full MUI rewrite
3. `/home/z/my-project/src/components/auth/forgot-password-form.tsx` - Full MUI rewrite
4. `/home/z/my-project/src/components/auth/otp-verification-form.tsx` - Full MUI rewrite
5. `/home/z/my-project/src/components/auth/language-selector.tsx` - Full MUI rewrite
6. `/home/z/my-project/src/components/auth/theme-toggle.tsx` - Full MUI rewrite
7. `/home/z/my-project/src/components/auth/terms-modal.tsx` - Full MUI rewrite

## Key Decisions
- Each form-level component (login, signup, forgot-password, otp) wraps itself in MUI `ThemeProvider` using `getAppTheme(theme)` from `@/lib/mui-theme`
- Sub-components (language-selector, theme-toggle, terms-modal) use MUI natively and inherit the ThemeProvider from their parent forms
- All styling uses `sx` prop — zero Tailwind classes
- All shadcn/ui imports removed
- All lucide-react icons replaced with `@mui/icons-material` equivalents
- framer-motion preserved for animations (not a UI component library)
- sonner toast preserved (not a UI component, it's a notification utility)
- No red/yellow colors — uses teal primary (#0D6B58) and amber secondary (#F59E0B) from theme

## Verification
- ESLint passes: 0 errors, 0 warnings
- No shadcn/ui imports in any auth component
- No Tailwind className in any auth component
- All business logic preserved
