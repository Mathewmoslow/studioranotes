'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  TextField,
  Container,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material'
import {
  School,
  Schedule,
  AutoAwesome,
  CloudUpload,
  Check,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { getUniversityList, getCanvasUrl, getUniversityConfig } from '@/data/universities'

const steps = [
  'Welcome',
  'University Setup',
  'Canvas Integration',
  'Study Preferences',
  'Get Started',
]

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { data: session } = useSession()
  const { addCourse } = useScheduleStore()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [canvasConnected, setCanvasConnected] = useState(false)
  const [canvasCourses, setCanvasCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importingCourses, setImportingCourses] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [processedCount, setProcessedCount] = useState(0)
  const [formData, setFormData] = useState({
    university: '',
    canvasUrl: '',
    canvasToken: '',
    studyHoursStart: '09:00',
    studyHoursEnd: '21:00',
    sessionDuration: 45,
    preferredTimes: [] as string[],
  })

  const handleNext = async () => {
    setError(null)

    // Handle Canvas connection step
    if (activeStep === 2 && formData.canvasUrl && formData.canvasToken) {
      await connectToCanvas()
    }

    // When moving from Study Preferences (step 3) to Final (step 4)
    if (activeStep === 3) {
      // Save preferences with university config
      const universityConfig = getUniversityConfig(formData.university)
      localStorage.setItem('onboarding_preferences', JSON.stringify({
        ...formData,
        universityConfig
      }))

      // Move to final step
      setActiveStep((prevActiveStep) => prevActiveStep + 1)

      // Auto-start import after showing success briefly
      setTimeout(async () => {
        if (selectedCourses.length > 0 && canvasConnected) {
          await importCanvasCourses()
          // Complete after import
          setTimeout(() => onComplete(), 1500)
        } else {
          // No courses, just complete
          setTimeout(() => onComplete(), 2000)
        }
      }, 1500)
    } else if (activeStep === steps.length - 1) {
      // Already on final step, shouldn't get here with new flow
      onComplete()
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }

  const connectToCanvas = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/canvas/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasUrl: formData.canvasUrl,
          canvasToken: formData.canvasToken
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect to Canvas')
      }

      const data = await response.json()
      setCanvasConnected(true)

      // Fetch courses
      await fetchCanvasCourses()

    } catch (error: any) {
      setError(error.message)
      console.error('Canvas connection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCanvasCourses = async () => {
    try {
      const response = await fetch('/api/canvas/courses', {
        headers: {
          'x-canvas-url': formData.canvasUrl,
          'x-canvas-token': formData.canvasToken
        }
      })

      if (!response.ok) throw new Error('Failed to fetch courses')

      const data = await response.json()
      setCanvasCourses(data.courses || [])
      // Don't auto-select courses - let user choose
      setSelectedCourses([])

    } catch (error: any) {
      console.error('Failed to fetch courses:', error)
    }
  }

  const importCanvasCourses = async () => {
    try {
      setImportingCourses(true)
      setProcessedCount(0)

      // Fun loading messages
      const loadingMessages = [
        "🚀 Launching course rockets...",
        "📚 Gathering syllabi from the academic cosmos...",
        "🧙‍♂️ Consulting the Canvas oracle...",
        "🔮 Decoding assignment mysteries...",
        "🎯 Pinpointing due dates with laser precision...",
        "🌟 Sprinkling some study magic...",
        "📝 Translating professor speak...",
        "⚡ Supercharging your schedule...",
        "🎨 Painting your academic masterpiece...",
        "🔥 Heating up the knowledge furnace..."
      ]

      let messageIndex = 0
      const messageInterval = setInterval(() => {
        setImportStatus(loadingMessages[messageIndex % loadingMessages.length])
        messageIndex++
      }, 2000)

      // Only import courses that were selected
      const coursesToImport = canvasCourses.filter(c =>
        selectedCourses.includes(c.id.toString())
      )

      // Don't import if no courses selected
      if (coursesToImport.length === 0) {
        console.log('No courses selected for import')
        clearInterval(messageInterval)
        setImportingCourses(false)
        return
      }

      setImportStatus(`📦 Importing ${coursesToImport.length} courses...`)

      const response = await fetch('/api/canvas/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: coursesToImport,
          canvasUrl: formData.canvasUrl,
          canvasToken: formData.canvasToken
        })
      })

      if (response.ok) {
        const data = await response.json()

        // Clear any existing courses first to avoid duplicates
        const { courses: existingCourses } = useScheduleStore.getState()

        // Process only the selected courses that were imported
        // The server returns all courses, but we only process the ones the user selected
        const selectedImportedCourses = data.importedCourses.filter((course: any) => {
          // Check if this course was in our selected list
          const courseId = course.canvasId?.toString() || course.id?.toString()
          return selectedCourses.includes(courseId)
        })

        console.log(`User selected ${selectedCourses.length} courses, processing ${selectedImportedCourses.length} of ${data.importedCourses.length} returned`)

        let courseIndex = 0
        for (const course of selectedImportedCourses) {
          courseIndex++
          setProcessedCount(courseIndex)
          setImportStatus(`📘 Processing ${course.name} (${courseIndex}/${selectedImportedCourses.length})`)
          // Parse schedule if we have syllabus or calendar events
          let parsedSchedule = null
          if (course.syllabus || course.calendarEvents?.length > 0) {
            try {
              const parseResponse = await fetch('/api/canvas/parse-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  syllabus: course.syllabus,
                  calendarEvents: course.calendarEvents,
                  courseFiles: course.courseFiles,
                  courseName: course.name
                })
              })

              if (parseResponse.ok) {
                const parseData = await parseResponse.json()
                parsedSchedule = parseData.schedule
              }
            } catch (error) {
              console.error('Failed to parse schedule for', course.name, error)
            }
          }

          // Check if course already exists to prevent duplicates
          const { courses: currentCourses, addTask } = useScheduleStore.getState()
          const courseExists = currentCourses.some(c =>
            c.name === course.name || c.code === course.code
          )

          if (!courseExists) {
            // Add course to store with parsed schedule
            addCourse({
              name: course.name,
              code: course.code,
              instructor: course.instructor,
              schedule: parsedSchedule?.lectures || [],
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              credits: 3,
              location: 'TBA',
              // Store additional data for later use
              canvasData: {
                assignments: course.assignments,
                exams: parsedSchedule?.exams || [],
                importantDates: parsedSchedule?.importantDates || [],
                officeHours: parsedSchedule?.officeHours,
                courseSchedule: parsedSchedule?.courseSchedule,
                calendarEvents: course.calendarEvents,
                modules: course.modules
              }
            } as any)

            // Create tasks from assignments
            if (course.assignments && course.assignments.length > 0) {
              course.assignments.forEach((assignment: any) => {
                if (assignment.dueDate) {
                  addTask({
                    title: assignment.name,
                    courseId: course.id,
                    courseName: course.name,
                    type: assignment.name.toLowerCase().includes('exam') ? 'exam' :
                          assignment.name.toLowerCase().includes('quiz') ? 'quiz' : 'assignment',
                    dueDate: new Date(assignment.dueDate),
                    duration: 120, // Default 2 hours
                    priority: 'medium',
                    status: 'pending',
                    description: assignment.description || '',
                    points: assignment.points || 0,
                    fromCanvas: true
                  } as any)
                }
              })
              console.log(`Created ${course.assignments.length} tasks for ${course.name}`)
            }
          } else {
            console.log(`Course ${course.name} already exists, skipping`)
          }
        }

        clearInterval(messageInterval)
        setImportStatus('✅ All courses imported successfully!')
        console.log('Successfully imported courses with enhanced data')
      }
    } catch (error) {
      console.error('Failed to import courses:', error)
      clearInterval(messageInterval)
      setImportStatus('❌ Import failed. Please try again.')
    } finally {
      setTimeout(() => {
        setImportingCourses(false)
        setImportStatus('')
      }, 2000)
    }
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Welcome to StudiOra Notes, {session?.user?.name || 'Student'}!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Let's set up your personalized academic workspace in just a few steps.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <School sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Smart Scheduling
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AI-powered study blocks that adapt to your energy levels
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <AutoAwesome sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      AI Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Generate comprehensive notes from any source material
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <CloudUpload sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Canvas Sync
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Auto-import assignments and deadlines from Canvas LMS
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Select Your University
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This helps us customize your experience and auto-configures Canvas integration
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>University</InputLabel>
              <Select
                value={formData.university}
                onChange={(e) => {
                  const universityId = e.target.value
                  const canvasUrl = getCanvasUrl(universityId)
                  const config = getUniversityConfig(universityId)

                  setFormData({
                    ...formData,
                    university: universityId,
                    canvasUrl: canvasUrl || formData.canvasUrl
                  })
                }}
                label="University"
              >
                {getUniversityList().map(uni => (
                  <MenuItem key={uni.id} value={uni.id}>
                    <Box>
                      <Typography variant="body2">{uni.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {uni.system === 'quarter' ? 'Quarter' : uni.system === 'trimester' ? 'Trimester' : 'Semester'} System
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                <MenuItem value="other">Other / Not Listed</MenuItem>
              </Select>
            </FormControl>

            {formData.university && formData.university !== 'other' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Canvas URL auto-configured:</strong> {getCanvasUrl(formData.university)}
                </Typography>
                {getUniversityConfig(formData.university)?.system === 'quarter' && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Quarter system detected - scheduling will adapt to 10-week terms
                  </Typography>
                )}
              </Alert>
            )}

            {formData.university === 'other' && (
              <Alert severity="info">
                <Typography variant="body2">
                  You'll need to enter your Canvas URL manually in the next step
                </Typography>
              </Alert>
            )}
          </Box>
        )

      case 2:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Connect Canvas LMS (Optional)
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Canvas integration allows automatic import of assignments and deadlines.
              You can skip this and add it later in settings.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {!canvasConnected ? (
              <>
                <TextField
                  fullWidth
                  label="Canvas URL"
                  placeholder={formData.university === 'other' ? "https://your-school.instructure.com" : ""}
                  value={formData.canvasUrl}
                  onChange={(e) => setFormData({ ...formData, canvasUrl: e.target.value })}
                  sx={{ mb: 3 }}
                  helperText={
                    formData.university && formData.university !== 'other'
                      ? `Auto-configured for ${getUniversityConfig(formData.university)?.name}`
                      : "Your school's Canvas URL"
                  }
                  disabled={loading || (formData.university && formData.university !== 'other')}
                  InputProps={{
                    readOnly: formData.university && formData.university !== 'other'
                  }}
                />

                <TextField
                  fullWidth
                  label="Canvas Access Token"
                  placeholder="Your Canvas API token"
                  value={formData.canvasToken}
                  onChange={(e) => setFormData({ ...formData, canvasToken: e.target.value })}
                  type="password"
                  sx={{ mb: 3 }}
                  helperText="Generate this in Canvas: Account → Settings → New Access Token"
                  disabled={loading}
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={connectToCanvas}
                    disabled={!formData.canvasUrl || !formData.canvasToken || loading}
                  >
                    {loading ? 'Connecting...' : 'Connect to Canvas'}
                  </Button>
                  <Button variant="outlined" size="small">
                    How to get Canvas token?
                  </Button>
                </Stack>
              </>
            ) : (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    ✅ Successfully connected to Canvas!
                  </Typography>
                </Alert>

                {canvasCourses.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Select Courses to Import
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {canvasCourses.length} active courses
                    </Typography>

                    <Stack spacing={2}>
                      {canvasCourses.map((course) => (
                        <Paper
                          key={course.id}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: selectedCourses.includes(course.id.toString()) ? 2 : 1,
                            borderColor: selectedCourses.includes(course.id.toString()) ? 'primary.main' : 'divider'
                          }}
                          onClick={() => {
                            const courseId = course.id.toString()
                            setSelectedCourses(prev =>
                              prev.includes(courseId)
                                ? prev.filter(id => id !== courseId)
                                : [...prev, courseId]
                            )
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {course.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {course.code} • {course.term}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Instructor: {course.instructor}
                              </Typography>
                            </Box>
                            {selectedCourses.includes(course.id.toString()) && (
                              <Check color="primary" />
                            )}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </>
                )}
              </Box>
            )}
          </Box>
        )

      case 3:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Set Your Study Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              We'll use these to create your personalized study schedule
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Study Start Time"
                  type="time"
                  value={formData.studyHoursStart}
                  onChange={(e) => setFormData({ ...formData, studyHoursStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Study End Time"
                  type="time"
                  value={formData.studyHoursEnd}
                  onChange={(e) => setFormData({ ...formData, studyHoursEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth sx={{ mt: 3, mb: 3 }}>
              <InputLabel>Session Duration</InputLabel>
              <Select
                value={formData.sessionDuration}
                onChange={(e) => setFormData({ ...formData, sessionDuration: Number(e.target.value) })}
                label="Session Duration"
              >
                <MenuItem value={25}>25 minutes (Pomodoro)</MenuItem>
                <MenuItem value={45}>45 minutes</MenuItem>
                <MenuItem value={60}>60 minutes</MenuItem>
                <MenuItem value={90}>90 minutes</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle1" gutterBottom>
              Preferred Study Times
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {['Early Morning', 'Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                <Chip
                  key={time}
                  label={time}
                  onClick={() => {
                    const newTimes = formData.preferredTimes.includes(time)
                      ? formData.preferredTimes.filter(t => t !== time)
                      : [...formData.preferredTimes, time]
                    setFormData({ ...formData, preferredTimes: newTimes })
                  }}
                  color={formData.preferredTimes.includes(time) ? 'primary' : 'default'}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        )

      case 4:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {importingCourses ? (
              <>
                <CircularProgress size={80} sx={{ mb: 3 }} />
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Importing Your Courses...
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {importStatus || 'Setting up your academic workspace...'}
                </Typography>

                {processedCount > 0 && selectedCourses.length > 0 && (
                  <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 3 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(processedCount / selectedCourses.length) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      {processedCount} of {selectedCourses.length} courses processed
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <>
                <Check sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  You're All Set!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Your personalized academic workspace is ready.
                </Typography>

                <Stack spacing={2} sx={{ mt: 4 }}>
                  <Alert severity="success">
                    <strong>✓ Account created</strong> - Connected with {session?.user?.email}
                  </Alert>
                  <Alert severity="success">
                    <strong>✓ University set</strong> - {formData.university || 'Your university'} configured for Canvas
                  </Alert>
                  {formData.canvasToken && (
                    <Alert severity="success">
                      <strong>✓ Canvas connected</strong> - {canvasCourses.length} courses found, {selectedCourses.length} selected
                    </Alert>
                  )}
                  <Alert severity="success">
                    <strong>✓ Study preferences</strong> - {formData.sessionDuration} min sessions, {formData.preferredTimes.length > 0 ? formData.preferredTimes.join(', ') : 'flexible schedule'}
                  </Alert>
                </Stack>
              </>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || activeStep === steps.length - 1}
            onClick={handleBack}
          >
            Back
          </Button>

          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={importingCourses}
            >
              {activeStep === steps.length - 2 ? 'Finish Setup' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  )
}