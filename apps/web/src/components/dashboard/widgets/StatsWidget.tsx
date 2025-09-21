'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Box,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'

interface StatsWidgetProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: string
  loading?: boolean
}

export default function StatsWidget({
  title,
  value,
  change,
  icon,
  color,
  loading = false
}: StatsWidgetProps) {
  const theme = useTheme()
  const isPositive = change?.startsWith('+')

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Skeleton variant="circular" width={48} height={48} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" height={40} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alpha(color, 0.1),
            color: color,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        {change && (
          <Box
            sx={{
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              color: isPositive ? 'success.main' : 'error.main',
            }}
          >
            {isPositive ? (
              <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
            ) : (
              <TrendingDown sx={{ fontSize: 16, mr: 0.5 }} />
            )}
            <Typography variant="caption" fontWeight={600}>
              {change}
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </Paper>
  )
}