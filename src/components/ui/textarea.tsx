import React from 'react'
import MuiTextareaAutosize from '@mui/material/TextareaAutosize'
import TextField from '@mui/material/TextField'

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <TextField multiline minRows={3} fullWidth {...props} />
}
