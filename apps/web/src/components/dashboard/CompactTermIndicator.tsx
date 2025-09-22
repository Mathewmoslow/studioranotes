'use client'

import React from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { useAcademicTermStore, useTermDisplay } from '@/stores/academicTermStore';

export default function CompactTermIndicator() {
  const { currentTerm } = useAcademicTermStore();
  const { termName, progress, currentWeek, remainingWeeks } = useTermDisplay();

  if (!currentTerm) return null;

  // Ensure we have valid data
  if (!termName || termName === 'No Active Term') return null;

  // Determine term type for color
  const getTermColor = () => {
    switch (currentTerm.type) {
      case 'fall': return '#FF6B35';
      case 'spring': return '#4CAF50';
      case 'summer': return '#FFD23F';
      case 'trimester1': return '#4CAF50';
      case 'trimester2': return '#2196F3';
      case 'trimester3': return '#FF9800';
      default: return '#667eea';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        mb: 2
      }}
    >
      <CalendarMonth sx={{ color: getTermColor(), fontSize: 20 }} />

      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {termName}
          </Typography>
          <Chip
            label={`Week ${currentWeek}/${currentTerm.weeks}`}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.7rem',
              bgcolor: getTermColor(),
              color: 'white'
            }}
          />
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: getTermColor(),
              borderRadius: 2
            }
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary">
        {remainingWeeks} weeks left
      </Typography>
    </Box>
  );
}