'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Tabs,
  Tab,
  Chip,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Alert,
  Fab,
} from '@mui/material'
import {
  ArrowBack,
  Description,
  Assignment,
  CalendarToday,
  School,
  Schedule,
  AutoAwesome,
  Add,
  FileDownload,
  Visibility,
  Delete,
  Quiz,
  MenuBook,
  TipsAndUpdates,
  Sync,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useScheduleStore } from '@/stores/useScheduleStore'
import GenerateNoteModal from '@/components/GenerateNoteModal'
import ContextGenie from '@/components/ContextGenie'

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
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function CourseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { courses, tasks, events, getNotesByCourse } = useScheduleStore()
  const [currentTab, setCurrentTab] = useState(0)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [contextGenieOpen, setContextGenieOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Find the course
  const course = courses.find(c => c.id === id)

  // Get course-specific data
  const courseTasks = tasks.filter(t => t.courseId === id)
  const courseEvents = events.filter(e => e.courseId === id)
  const courseNotes = getNotesByCourse ? getNotesByCourse(id as string) : []

  // Get saved notes from localStorage
  const [savedNotes, setSavedNotes] = useState<any[]>([])

  useEffect(() => {
    const notes = localStorage.getItem('generated-notes')
    if (notes) {
      const allNotes = JSON.parse(notes)
      const filteredNotes = Object.entries(allNotes)
        .filter(([_, note]: any) => note.courseId === id || note.courseName === course?.name)
        .map(([key, note]) => ({ id: key, ...note }))
      setSavedNotes(filteredNotes)
    }
  }, [id, course])

  if (!session) {
    return (
      <Container>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">Please sign in to view course details</Typography>
        </Box>
      </Container>
    )
  }

  if (!course) {
    return (
      <Container>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">Course not found</Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/courses')}
            sx={{ mt: 2 }}
          >
            Back to Courses
          </Button>
        </Box>
      </Container>
    )
  }

  const handleDeleteNote = (noteId: string) => {
    const notes = localStorage.getItem('generated-notes')
    if (notes) {
      const allNotes = JSON.parse(notes)
      delete allNotes[noteId]
      localStorage.setItem('generated-notes', JSON.stringify(allNotes))
      setSavedNotes(prev => prev.filter(n => n.id !== noteId))
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'project':
        return <Assignment />
      case 'quiz':
      case 'exam':
        return <Quiz />
      case 'reading':
        return <MenuBook />
      default:
        return <Assignment />
    }
  }

  const upcomingTasks = courseTasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5)

  const syncWithCanvas = async () => {
    if (!course?.canvasId) return

    setSyncing(true)
    try {
      // Get Canvas credentials from localStorage
      const prefs = localStorage.getItem('onboarding_preferences')
      if (!prefs) {
        alert('Canvas credentials not found. Please reconnect in settings.')
        return
      }

      const { canvasUrl, canvasToken } = JSON.parse(prefs)

      const response = await fetch('/api/canvas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          canvasId: course.canvasId,
          canvasUrl,
          canvasToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLastSync(new Date())

        // Show summary of changes
        const { summary } = data
        if (summary.newAssignmentsCount > 0 || summary.announcementsCount > 0) {
          alert(`Canvas sync complete!\n\nNew assignments: ${summary.newAssignmentsCount}\nAnnouncements: ${summary.announcementsCount}\nUpcoming events: ${summary.eventsCount}`)
        } else {
          alert('Canvas sync complete! No new changes.')
        }

        // Reload to show new data
        window.location.reload()
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Failed to sync with Canvas')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/courses')}
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderTop: `4px solid ${course.color}`,
            bgcolor: 'background.paper',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {course.code} - {course.name}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {course.instructor && (
                  <Chip
                    icon={<School />}
                    label={course.instructor}
                  />
                )}
                {course.semester && (
                  <Chip
                    icon={<CalendarToday />}
                    label={`${course.semester} ${course.year}`}
                  />
                )}
                {course.creditHours && (
                  <Chip
                    icon={<Schedule />}
                    label={`${course.creditHours} credits`}
                  />
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {course.canvasId && (
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    onClick={syncWithCanvas}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : 'Sync Canvas'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<TipsAndUpdates />}
                  onClick={() => setContextGenieOpen(true)}
                >
                  Context Genie
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AutoAwesome />}
                  onClick={() => setGenerateModalOpen(true)}
                >
                  Generate Note
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab label="Overview" />
          <Tab label={`Notes (${savedNotes.length})`} />
          <Tab label={`Assignments (${courseTasks.length})`} />
          <Tab label="Schedule" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Course Stats */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Course Statistics
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Notes
                    </Typography>
                    <Typography variant="h4">
                      {savedNotes.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Assignments
                    </Typography>
                    <Typography variant="h4">
                      {courseTasks.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                    <Typography variant="h4">
                      {courseTasks.length > 0
                        ? Math.round((courseTasks.filter(t => t.status === 'completed').length / courseTasks.length) * 100)
                        : 0}%
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Notes */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Notes
                </Typography>
                {savedNotes.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      No notes yet for this course
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesome />}
                      onClick={() => setGenerateModalOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Generate First Note
                    </Button>
                  </Box>
                ) : (
                  <List>
                    {savedNotes.slice(0, 3).map((note, index) => (
                      <React.Fragment key={note.id}>
                        {index > 0 && <Divider />}
                        <ListItem>
                          <ListItemIcon>
                            <Description />
                          </ListItemIcon>
                          <ListItemText
                            primary={note.topic || 'Untitled Note'}
                            secondary={`${note.noteStyle} • ${note.noteType} • ${format(new Date(note.timestamp), 'MMM d, yyyy')}`}
                          />
                          <IconButton
                            onClick={() => setSelectedNote(note)}
                          >
                            <Visibility />
                          </IconButton>
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming Tasks */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Tasks
                </Typography>
                {upcomingTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming tasks
                  </Typography>
                ) : (
                  <List>
                    {upcomingTasks.map((task, index) => (
                      <React.Fragment key={task.id}>
                        {index > 0 && <Divider />}
                        <ListItem>
                          <ListItemIcon>
                            {getTaskIcon(task.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={task.title}
                            secondary={`Due: ${format(task.dueDate, 'MMM d, yyyy')}`}
                          />
                          <Chip
                            label={task.type}
                            size="small"
                            color="primary"
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {savedNotes.length === 0 ? (
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      No notes yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Generate your first note for this course
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesome />}
                      onClick={() => setGenerateModalOpen(true)}
                      sx={{ mt: 3 }}
                    >
                      Generate Note
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            savedNotes.map((note) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={note.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {note.topic || 'Untitled Note'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip label={note.noteStyle} size="small" />
                      <Chip label={note.noteType} size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => setSelectedNote(note)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        startIcon={<FileDownload />}
                        onClick={() => {
                          const blob = new Blob([note.content], { type: 'text/markdown' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${note.topic || 'note'}.md`
                          a.click()
                        }}
                      >
                        Export
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* Assignments Tab */}
      <TabPanel value={currentTab} index={2}>
        {courseTasks.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Assignment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  No assignments yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assignments will appear here when imported from Canvas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <List>
            {courseTasks
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .map((task, index) => (
                <React.Fragment key={task.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      {getTaskIcon(task.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Stack direction="row" spacing={2} component="span">
                          <span>Due: {format(task.dueDate, 'MMM d, yyyy h:mm a')}</span>
                          {task.description && <span>• {task.description}</span>}
                        </Stack>
                      }
                    />
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={task.type}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={task.status}
                        size="small"
                        color={task.status === 'completed' ? 'success' : 'default'}
                      />
                    </Stack>
                  </ListItem>
                </React.Fragment>
              ))}
          </List>
        )}
      </TabPanel>

      {/* Schedule Tab */}
      <TabPanel value={currentTab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Course Schedule
            </Typography>
            {course.syllabus ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Syllabus data available. AI schedule parsing coming soon.
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No schedule information available. Import from Canvas to see course schedule.
              </Typography>
            )}
            {courseEvents.length > 0 && (
              <List>
                {courseEvents
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((event, index) => (
                    <React.Fragment key={event.id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemIcon>
                          <CalendarToday />
                        </ListItemIcon>
                        <ListItemText
                          primary={event.title}
                          secondary={`${format(new Date(event.startTime), 'MMM d, yyyy h:mm a')} - ${format(new Date(event.endTime), 'h:mm a')}`}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Generate Note Modal */}
      <GenerateNoteModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        preSelectedCourse={course}
      />

      {/* Context Genie Modal */}
      <ContextGenie
        open={contextGenieOpen}
        onClose={() => setContextGenieOpen(false)}
        course={course}
      />

      {/* View Note Dialog */}
      {selectedNote && (
        <Dialog
          open={Boolean(selectedNote)}
          onClose={() => setSelectedNote(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedNote.topic || 'Note'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {selectedNote.content}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedNote(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  )
}

// Add missing imports at the top
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'