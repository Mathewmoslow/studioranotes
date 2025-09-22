'use client'

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Stack,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CalendarMonth,
  School,
  ArrowForward,
  Info
} from '@mui/icons-material';
import { useAcademicTermStore, useTermDisplay } from '@/stores/academicTermStore';
import { formatTermName } from '@/lib/academic-terms';

export default function TermSelector() {
  const {
    currentTerm,
    selectedSystem,
    setCurrentTerm,
    getAvailableTerms,
    getNextTermForSystem
  } = useAcademicTermStore();

  const {
    termName,
    progress,
    currentWeek,
    remainingWeeks,
    isTrimeser
  } = useTermDisplay();

  const availableTerms = getAvailableTerms();
  const nextTerm = getNextTermForSystem();

  const handleTermChange = (termId: string) => {
    const term = availableTerms.find(t => t.id === termId);
    if (term) {
      setCurrentTerm(term);
    }
  };

  const getTermColor = () => {
    if (isTrimeser) {
      switch (currentTerm?.type) {
        case 'trimester1': return '#4CAF50';
        case 'trimester2': return '#2196F3';
        case 'trimester3': return '#FF9800';
        default: return '#667eea';
      }
    }
    switch (currentTerm?.type) {
      case 'fall': return '#FF6B35';
      case 'spring': return '#4CAF50';
      case 'summer': return '#FFD23F';
      default: return '#667eea';
    }
  };

  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Academic Term
            </Typography>
            <Chip
              icon={<School />}
              label={selectedSystem === 'trimester' ? 'Trimester System' : 'Semester System'}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Box>

          {/* Term Selector */}
          <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Current Term</InputLabel>
            <Select
              value={currentTerm?.id || ''}
              onChange={(e) => handleTermChange(e.target.value)}
              label="Current Term"
            >
              {availableTerms.map((term) => (
                <MenuItem key={term.id} value={term.id}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CalendarMonth fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {formatTermName(term)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Progress Bar */}
          {currentTerm && (
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Week {currentWeek} of {currentTerm.weeks}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {remainingWeeks} weeks remaining
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'white',
                    borderRadius: 1
                  }
                }}
              />
            </Box>
          )}

          {/* Next Term Preview */}
          {nextTerm && currentTerm?.id !== nextTerm.id && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <ArrowForward sx={{ color: 'rgba(255,255,255,0.7)' }} fontSize="small" />
              <Box flex={1}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Next Term:
                </Typography>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                  {formatTermName(nextTerm)} starts {new Date(nextTerm.startDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Tooltip title="Plan ahead for next term">
                <IconButton size="small" sx={{ color: 'white' }}>
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Trimester Info for Advent Health */}
          {isTrimeser && (
            <Box
              sx={{
                p: 1,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: getTermColor()
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Advent Health University operates on a trimester system with three 14-week terms per year.
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}