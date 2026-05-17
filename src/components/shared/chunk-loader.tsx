'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import { keyframes } from '@mui/system'

const progressLine = keyframes`
  0% { width: 0%; }
  50% { width: 65%; }
  90% { width: 90%; }
  100% { width: 100%; }
`

export function ChunkLoader() {
  return (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Stack direction="column" spacing={2.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={40} thickness={3} />
        <Box sx={{ width: 12, height: 0.25, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              borderRadius: 1,
              bgcolor: 'primary.main',
              animation: `${progressLine} 2s ease-out forwards`,
            }}
          />
        </Box>
      </Stack>
    </Stack>
  )
}
