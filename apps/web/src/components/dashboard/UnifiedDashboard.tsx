'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  useTheme,
  alpha,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  CalendarMonth,
  Description,
  Analytics,
  School,
  AutoAwesome,
  Add,
  TrendingUp,
  AccessTime,
  Assignment,
  Quiz,
  MenuBook,
} from '@mui/icons-material'
import { format, startOfWeek, addDays } from 'date-fns'

// Import components from both platforms
import DashboardLayout from './DashboardLayout'
import SchedulerView from '../scheduler/SchedulerView'
import { useScheduleStore } from '@/stores/useScheduleStore'
import StatsCard from './widgets/StatsWidget'
import CourseProgressWidget from './widgets/CourseProgressWidget'
import RecentNotesWidget from './widgets/RecentNotesWidget'
import StudyActivityChart from './widgets/StudyActivityChart'
import UpcomingTasks from './widgets/UpcomingTasks'
import CompactTermIndicator from './CompactTermIndicator'
import { initializeAcademicTerm } from '@/stores/academicTermStore'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function UnifiedDashboard() {
  const theme = useTheme()
  const [currentTab, setCurrentTab] = useState(0)
  const [weekView, setWeekView] = useState<Date[]>([])

  // Get data from store
  const { courses, tasks, events, timeBlocks, getUpcomingTasks, getTasksForDate } = useScheduleStore()

  // Calculate stats
  const stats = {
    totalNotes: localStorage.getItem('generated-notes')
      ? Object.keys(JSON.parse(localStorage.getItem('generated-notes') || '{}')).length
      : 0,
    activeCourses: courses.length,
    upcomingTasks: getUpcomingTasks(7).length,
    studyHours: Math.round(timeBlocks.reduce((acc, block) => acc + block.duration, 0) / 60),
    completionRate: tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
      : 0,
  }

  useEffect(() => {
    // Initialize academic term on mount
    initializeAcademicTerm()

    // Set up week view
    const start = startOfWeek(new Date())
    const week = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    setWeekView(week)
  }, [])

  return (
    <DashboardLayout>
      {/* Compact Term Indicator */}
      <CompactTermIndicator />

      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`,
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Welcome back! Let's make today productive
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
              You have {stats.upcomingTasks} tasks due this week. Your next study block starts in 2 hours.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<AutoAwesome />}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                Generate Notes
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': { bgcolor: alpha('#fff', 0.1) }
                }}
              >
                Add Task
              </Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" fontWeight={700}>
                {stats.completionRate}%
              </Typography>
              <Typography variant="subtitle1">
                Weekly Completion Rate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab icon={<DashboardIcon />} label="Overview" />
          <Tab icon={<CalendarMonth />} label="Schedule" />
          <Tab icon={<Description />} label="Notes" />
          <Tab icon={<Analytics />} label="Analytics" />
        </Tabs>
      </Paper>

      <TabPanel value={currentTab} index={0}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Total Notes"
              value={stats.totalNotes}
              change="+5 this week"
              icon={<Description />}
              color="#667eea"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Active Courses"
              value={stats.activeCourses}
              icon={<School />}
              color="#f093fb"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Study Hours"
              value={`${stats.studyHours}h`}
              change="+18%"
              icon={<AccessTime />}
              color="#4facfe"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Tasks Due"
              value={stats.upcomingTasks}
              icon={<Assignment />}
              color="#43e97b"
            />
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Week Overview */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                This Week's Schedule
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {weekView.map((day) => {
                  const dayTasks = getTasksForDate(day)
                  const hasClass = events.some(e =>
                    format(new Date(e.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  )

                  return (
                    <Grid size="auto" key={day.toISOString()}>
                      <Card
                        sx={{
                          p: 2,
                          minWidth: 120,
                          textAlign: 'center',
                          border: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            ? `2px solid ${theme.palette.primary.main}`
                            : '1px solid transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: 2,
                          }
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {format(day, 'EEE')}
                        </Typography>
                        <Typography variant="h5" fontWeight={600}>
                          {format(day, 'd')}
                        </Typography>
                        <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 1 }}>
                          {hasClass && (
                            <Chip
                              size="small"
                              icon={<School />}
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {dayTasks.length > 0 && (
                            <Chip
                              label={dayTasks.length}
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                        </Stack>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Paper>
          </Grid>

          {/* Upcoming Tasks */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <UpcomingTasks />
          </Grid>

          {/* Course Progress */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <CourseProgressWidget
              courses={courses.map(c => ({
                id: c.id,
                name: c.name,
                progress: Math.round(Math.random() * 100), // TODO: Calculate real progress
                color: c.color || '#667eea',
                icon: <School />,
                notesCount: c.notesCount || 0,
                lastAccessed: 'Recently'
              }))}
            />
          </Grid>

          {/* Study Activity */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <StudyActivityChart />
          </Grid>

          {/* Recent Notes */}
          <Grid size={12}>
            <RecentNotesWidget />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <SchedulerView />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Typography variant="h5" gutterBottom>
          Notes Library
        </Typography>
        <RecentNotesWidget />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Typography variant="h5" gutterBottom>
          Study Analytics
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StudyActivityChart />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              {/* Add performance charts here */}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </DashboardLayout>
  )
}