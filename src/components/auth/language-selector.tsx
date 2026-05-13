'use client'

import { useState } from 'react'
import { IconButton, Menu, MenuItem, Tooltip, Typography, Stack, Box } from '@mui/material'
import { Language as LanguageIcon } from '@mui/icons-material'
import { useI18n } from '@/i18n/use-translation'
import type { Language } from '@/types'

const languages: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
]

export function LanguageSelector() {
  const { language, setLanguage, isRTL } = useI18n()

  const currentLang = languages.find((l) => l.value === language) ?? languages[0]

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (lang: Language) => {
    setLanguage(lang)
    handleClose()
  }

  return (
    <>
      <Tooltip title="Select language">
        <IconButton
          onClick={handleClick}
          aria-label="Select language"
          size="small"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            height: 36,
            px: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            '&:hover': {
              bgcolor: 'action.selected',
              borderColor: 'primary.main',
            },
          }}
        >
          <LanguageIcon sx={{ fontSize: 18 }} />
          <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>{currentLang.flag}</Box>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isRTL ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              minWidth: 140,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'divider',
              mt: 0.5,
            },
          },
        }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.value}
            onClick={() => handleSelect(lang.value)}
            selected={language === lang.value}
            sx={{
              borderRadius: 1,
              mx: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontWeight: 500,
                '&:hover': {
                  bgcolor: 'primary.light',
                },
              },
            }}
          >
            <Box component="span" sx={{ fontSize: 16 }}>{lang.flag}</Box>
            <Typography variant="body2">{lang.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
