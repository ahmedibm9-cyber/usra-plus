'use client'

import React from 'react'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

export function SectionCard({
  children,
  sx,
}: {
  children: React.ReactNode
  sx?: object
}) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: 3,
        transition: 'box-shadow 0.2s',
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}

export function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Typography
      variant="subtitle1"
      sx={{
        fontWeight: 600,
        mb: 0.5,
        ...sx,
      }}
    >
      {children}
    </Typography>
  )
}

export function SectionDescription({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="body2"
      sx={{ color: 'text.secondary' }}
      sx={{ mb: 2 }}
    >
      {children}
    </Typography>
  )
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 0,
          pb: 0,
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{children}</Box>
    </Stack>
  )
}
