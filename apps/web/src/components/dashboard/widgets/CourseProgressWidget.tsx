'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Avatar,
  Stack,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material'
import {
  MoreVert,
  ArrowForward,
  AccessTime,
  Description,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  name: string
  progress: number
  color: string
  icon: React.ReactNode
  notesCount: number
  lastAccessed: string
}

interface CourseProgressWidgetProps {
  courses: Course[]
  loading?: boolean
}

export default function CourseProgressWidget({ courses, loading = false }: CourseProgressWidgetProps) {
  const theme = useTheme()
  const router = useRouter()

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Course Progress
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6 }} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    )
  }

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
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Course Progress
        </Typography>
        <IconButton size="small">
          <MoreVert />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {courses.map((course) => (
          <Grid size={{ xs: 12, sm: 6 }} key={course.id}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[2],
                  borderColor: course.color,
                },
              }}
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: alpha(course.color, 0.1),
                      color: course.color,
                      mr: 2,
                    }}
                  >
                    {course.icon}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {course.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {course.lastAccessed}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton size="small">
                    <ArrowForward fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {course.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={course.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(course.color, 0.1),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: course.color,
                      },
                    }}
                  />
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    icon={<Description />}
                    label={`${course.notesCount} notes`}
                    size="small"
                    sx={{
                      fontSize: 11,
                      height: 24,
                      '& .MuiChip-icon': {
                        fontSize: 14,
                      },
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  )
}