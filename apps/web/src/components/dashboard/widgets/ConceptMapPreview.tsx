'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
} from '@mui/material'
import {
  BubbleChart,
  ArrowForward,
  Science,
  LocalHospital,
  Psychology,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

export default function ConceptMapPreview() {
  const theme = useTheme()
  const router = useRouter()

  const conceptMaps = [
    {
      id: 'heart-failure',
      title: 'Heart Failure',
      course: 'Pathophysiology',
      nodes: 12,
      connections: 18,
      icon: <LocalHospital />,
      color: '#f093fb',
      lastUpdated: '2 days ago',
    },
    {
      id: 'diabetes',
      title: 'Diabetes Mellitus',
      course: 'Pathophysiology',
      nodes: 15,
      connections: 22,
      icon: <Science />,
      color: '#667eea',
      lastUpdated: '1 week ago',
    },
    {
      id: 'depression',
      title: 'Depression',
      course: 'Mental Health',
      nodes: 10,
      connections: 14,
      icon: <Psychology />,
      color: '#4facfe',
      lastUpdated: '3 days ago',
    },
  ]

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BubbleChart sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Concept Maps
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => router.push('/tools/concepts')}
          sx={{ textTransform: 'none' }}
        >
          View All
        </Button>
      </Box>

      <Grid container spacing={2}>
        {conceptMaps.map((map) => (
          <Grid size={{ xs: 12, md: 4 }} key={map.id}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[2],
                  borderColor: map.color,
                },
              }}
              onClick={() => router.push(`/concepts/${map.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: alpha(map.color, 0.1),
                      color: map.color,
                      mr: 2,
                    }}
                  >
                    {map.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {map.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {map.course}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <svg width="100%" height="80" viewBox="0 0 200 80">
                    <circle cx="50" cy="40" r="8" fill={alpha(map.color, 0.6)} />
                    <circle cx="100" cy="20" r="10" fill={alpha(map.color, 0.8)} />
                    <circle cx="150" cy="50" r="7" fill={alpha(map.color, 0.5)} />
                    <circle cx="100" cy="60" r="9" fill={alpha(map.color, 0.7)} />
                    <line x1="50" y1="40" x2="100" y2="20" stroke={alpha(map.color, 0.3)} strokeWidth="1" />
                    <line x1="100" y1="20" x2="150" y2="50" stroke={alpha(map.color, 0.3)} strokeWidth="1" />
                    <line x1="100" y1="60" x2="150" y2="50" stroke={alpha(map.color, 0.3)} strokeWidth="1" />
                    <line x1="50" y1="40" x2="100" y2="60" stroke={alpha(map.color, 0.3)} strokeWidth="1" />
                  </svg>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`${map.nodes} nodes`}
                    size="small"
                    sx={{ fontSize: 11, height: 20 }}
                  />
                  <Chip
                    label={`${map.connections} links`}
                    size="small"
                    sx={{ fontSize: 11, height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {map.lastUpdated}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  )
}