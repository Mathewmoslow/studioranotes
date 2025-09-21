'use client'

import React, { useState, useEffect } from 'react'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  useTheme,
  alpha,
  Stack,
  Skeleton,
} from '@mui/material'
import {
  School,
  Description,
  TrendingUp,
  AccessTime,
  ArrowForward,
  MoreVert,
  CalendarToday,
  CheckCircle,
  RadioButtonUnchecked,
  Visibility,
  Edit,
  Book,
  Science,
  Psychology,
  LocalHospital,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import StatsWidget from './widgets/StatsWidget'
import CourseProgressWidget from './widgets/CourseProgressWidget'
import RecentNotesWidget from './widgets/RecentNotesWidget'
import StudyActivityChart from './widgets/StudyActivityChart'
import ConceptMapPreview from './widgets/ConceptMapPreview'
import UpcomingTasks from './widgets/UpcomingTasks'

interface Course {
  id: string
  name: string
  progress: number
  color: string
  icon: React.ReactNode
  notesCount: number
  lastAccessed: string
}

export default function DashboardWidgets() {
  const theme = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState({
    totalNotes: 0,
    coursesActive: 0,
    studyHours: 0,
    averageGrade: 0,
  })

  useEffect(() => {
    setTimeout(() => {
      setCourses([
        {
          id: 'NURS320',
          name: 'Pathophysiology',
          progress: 75,
          color: '#667eea',
          icon: <Science />,
          notesCount: 12,
          lastAccessed: '2 hours ago'
        },
        {
          id: 'NURS330',
          name: 'Pharmacology',
          progress: 60,
          color: '#f093fb',
          icon: <LocalHospital />,
          notesCount: 8,
          lastAccessed: '1 day ago'
        },
        {
          id: 'NURS340',
          name: 'Mental Health',
          progress: 45,
          color: '#4facfe',
          icon: <Psychology />,
          notesCount: 6,
          lastAccessed: '3 days ago'
        },
        {
          id: 'NURS350',
          name: 'Clinical Practice',
          progress: 90,
          color: '#43e97b',
          icon: <Book />,
          notesCount: 15,
          lastAccessed: 'Just now'
        }
      ])
      setStats({
        totalNotes: 41,
        coursesActive: 4,
        studyHours: 127,
        averageGrade: 87,
      })
      setLoading(false)
    }, 1000)
  }, [])

  return (
    <Box>
      {/* Welcome Section */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Welcome back! Ready to study?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              You're on a 7-day streak! Keep up the great work.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<Description />}
                onClick={() => router.push('/?action=generate')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Generate Notes
              </Button>
              <Button
                variant="outlined"
                startIcon={<School />}
                onClick={() => router.push('/courses')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                View Courses
              </Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" fontWeight={700} color="primary.main">
                  {stats.averageGrade}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Average Grade
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget
            title="Total Notes"
            value={stats.totalNotes}
            change="+12%"
            icon={<Description />}
            color="#667eea"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget
            title="Active Courses"
            value={stats.coursesActive}
            change="+2"
            icon={<School />}
            color="#f093fb"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget
            title="Study Hours"
            value={stats.studyHours}
            change="+18%"
            icon={<AccessTime />}
            color="#4facfe"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget
            title="Completion Rate"
            value={`${Math.round((75 + 60 + 45 + 90) / 4)}%`}
            change="+5%"
            icon={<TrendingUp />}
            color="#43e97b"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Course Progress */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <CourseProgressWidget courses={courses} loading={loading} />
        </Grid>

        {/* Upcoming Tasks */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <UpcomingTasks />
        </Grid>

        {/* Recent Notes */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <RecentNotesWidget />
        </Grid>

        {/* Study Activity */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <StudyActivityChart />
        </Grid>

        {/* Concept Map Preview */}
        <Grid size={12}>
          <ConceptMapPreview />
        </Grid>
      </Grid>
    </Box>
  )
}