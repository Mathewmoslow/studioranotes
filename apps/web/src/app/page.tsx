'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  Alert,
  Stack,
  Chip,
  IconButton,
  Avatar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  School,
  Schedule,
  Description,
  AutoAwesome,
  TrendingUp,
  AccessTime,
  CalendarToday,
  Assignment,
  CloudUpload,
  Google,
  ArrowForward,
} from '@mui/icons-material'
import UnifiedDashboard from '@/components/dashboard/UnifiedDashboard'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { useDatabaseSync } from '@/lib/db-sync'
import { getCanvasAutoSync } from '@/lib/canvas-auto-sync'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const { courses, tasks, events } = useScheduleStore()

  // Enable database sync when user is logged in
  useDatabaseSync()

  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboarding = async () => {
      if (session?.user?.email) {
        const completed = localStorage.getItem(`onboarding_${session.user.email}`)
        setOnboardingComplete(!!completed)
      }
      setLoading(false)
    }

    if (status === 'authenticated') {
      checkOnboarding()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status])

  // Landing page for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                fontWeight={800}
                color="white"
                gutterBottom
                sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}
              >
                StudiOra Notes
              </Typography>
              <Typography
                variant="h5"
                color="rgba(255, 255, 255, 0.9)"
                sx={{ mb: 4, fontWeight: 400 }}
              >
                The ultimate academic platform combining intelligent scheduling
                with AI-powered note generation
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Chip
                  icon={<AutoAwesome />}
                  label="AI-Powered"
                  sx={{ bgcolor: 'white', fontWeight: 600 }}
                />
                <Chip
                  icon={<Schedule />}
                  label="Smart Scheduling"
                  sx={{ bgcolor: 'white', fontWeight: 600 }}
                />
                <Chip
                  icon={<School />}
                  label="Canvas Integration"
                  sx={{ bgcolor: 'white', fontWeight: 600 }}
                />
              </Stack>

              <Button
                variant="contained"
                size="large"
                startIcon={<Google />}
                onClick={() => signIn('google')}
                sx={{
                  bgcolor: 'white',
                  color: '#667eea',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                Get Started with Google
              </Button>

              <Typography
                variant="body2"
                sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.8)' }}
              >
                Free for students • No credit card required
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    <CardContent>
                      <DashboardIcon sx={{ fontSize: 40, color: '#667eea', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Unified Dashboard
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All your academic life in one beautiful, organized view
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    <CardContent>
                      <Description sx={{ fontSize: 40, color: '#f093fb', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        AI Note Generation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create comprehensive notes from any source material
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    <CardContent>
                      <CalendarToday sx={{ fontSize: 40, color: '#4facfe', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        DynaSchedule™
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Adaptive scheduling that evolves with your progress
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    <CardContent>
                      <CloudUpload sx={{ fontSize: 40, color: '#43e97b', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Canvas Sync
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Auto-import assignments and deadlines from Canvas LMS
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 200 }} />
          <Typography>Loading StudiOra Notes...</Typography>
        </Stack>
      </Box>
    )
  }

  // Onboarding flow for new users
  if (!onboardingComplete) {
    return (
      <OnboardingFlow
        onComplete={() => {
          if (session?.user?.email) {
            localStorage.setItem(`onboarding_${session.user.email}`, 'true')
            setOnboardingComplete(true)
          }
        }}
      />
    )
  }

  // Main dashboard for authenticated users
  return <UnifiedDashboard />
}