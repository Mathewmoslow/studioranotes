import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { SvgIconComponent } from '@mui/icons-material'

interface EmptyStateProps {
  icon?: React.ReactNode | SvgIconComponent
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        minHeight: 300
      }}
    >
      {Icon && (
        <Box sx={{ color: 'text.secondary', mb: 3, opacity: 0.5 }}>
          {React.isValidElement(Icon) ? Icon : <Icon sx={{ fontSize: 64 }} />}
        </Box>
      )}

      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}

      {action && (
        <Button variant="contained" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  )
}