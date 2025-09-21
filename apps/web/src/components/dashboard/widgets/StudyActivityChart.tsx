'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Box,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material'

export default function StudyActivityChart() {
  const theme = useTheme()
  const [timeRange, setTimeRange] = React.useState('week')

  const data = [
    { day: 'Mon', hours: 3.5, notes: 5 },
    { day: 'Tue', hours: 4.2, notes: 7 },
    { day: 'Wed', hours: 2.8, notes: 3 },
    { day: 'Thu', hours: 5.1, notes: 8 },
    { day: 'Fri', hours: 3.7, notes: 6 },
    { day: 'Sat', hours: 6.2, notes: 10 },
    { day: 'Sun', hours: 4.5, notes: 7 },
  ]

  const maxHours = Math.max(...data.map(d => d.hours))

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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Study Activity
        </Typography>
        <FormControl size="small">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{
              fontSize: 14,
              '& .MuiSelect-select': {
                py: 0.5,
              },
            }}
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {data.map((item, index) => (
          <Box
            key={item.day}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: `${(item.hours / maxHours) * 100}%`,
                minHeight: 20,
                background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.6)} 100%)`,
                borderRadius: '8px 8px 0 0',
                position: 'relative',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  '&::after': {
                    opacity: 1,
                  },
                },
                '&::after': {
                  content: `"${item.hours}h"`,
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.day}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Study Time
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {data.reduce((acc, d) => acc + d.hours, 0).toFixed(1)} hours
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Notes Created
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {data.reduce((acc, d) => acc + d.notes, 0)} notes
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}