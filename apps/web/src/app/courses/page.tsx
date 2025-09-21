'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  School,
  Schedule,
  Assignment,
  MoreVert,
  CalendarMonth
} from '@mui/icons-material'
import { useScheduleStore } from '@/stores/useScheduleStore'
// Inline EmptyState component
const EmptyState = ({ icon, title, description, action }) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <Box sx={{ mb: 2, color: 'text.secondary' }}>
      {icon}
    </Box>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      {description}
    </Typography>
    {action && (
      <Button variant="contained" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Box>
)

export default function CoursesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { courses, addCourse, updateCourse, deleteCourse } = useScheduleStore()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    instructor: '',
    creditHours: 3,
    semester: 'Spring',
    year: new Date().getFullYear(),
    color: '#667eea'
  })

  const handleSubmit = () => {
    const courseData = {
      id: editingCourse?.id || `course-${Date.now()}`,
      userId: session?.user?.email || 'demo',
      ...formData,
      createdAt: editingCourse?.createdAt || new Date(),
      updatedAt: new Date()
    }

    if (editingCourse) {
      updateCourse(editingCourse.id, courseData)
    } else {
      addCourse(courseData)
    }

    setOpenDialog(false)
    setEditingCourse(null)
    setFormData({
      name: '',
      code: '',
      instructor: '',
      creditHours: 3,
      semester: 'Spring',
      year: new Date().getFullYear(),
      color: '#667eea'
    })
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      code: course.code,
      instructor: course.instructor || '',
      creditHours: course.creditHours || 3,
      semester: course.semester || 'Spring',
      year: course.year || new Date().getFullYear(),
      color: course.color
    })
    setOpenDialog(true)
  }

  const handleDelete = (courseId) => {
    if (confirm('Are you sure you want to delete this course?')) {
      deleteCourse(courseId)
    }
  }

  const totalCredits = courses.reduce((sum, course) => sum + (course.creditHours || 0), 0)

  if (!session) {
    return (
      <Container>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">Please sign in to view your courses</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          My Courses
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<School />}
            label={`${courses.length} Courses`}
            color="primary"
          />
          <Chip
            icon={<Assignment />}
            label={`${totalCredits} Credit Hours`}
            color="secondary"
          />
        </Stack>
      </Box>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<School />}
              title="No courses yet"
              description="Add your first course to start organizing your academic schedule"
              action={{
                label: "Add Course",
                onClick: () => setOpenDialog(true)
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid key={course.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  borderTop: `4px solid ${course.color}`,
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {course.code}
                    </Typography>
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography variant="body1" gutterBottom>
                    {course.name}
                  </Typography>

                  {course.instructor && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Instructor: {course.instructor}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Chip
                      size="small"
                      icon={<CalendarMonth />}
                      label={`${course.semester} ${course.year}`}
                    />
                    <Chip
                      size="small"
                      icon={<Schedule />}
                      label={`${course.creditHours} credits`}
                    />
                  </Stack>

                  {course.progress > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption">Progress</Typography>
                        <Typography variant="caption">{course.progress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={course.progress} />
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleEdit(course)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(course.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Course FAB */}
      <Fab
        color="primary"
        aria-label="add course"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>

      {/* Add/Edit Course Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCourse ? 'Edit Course' : 'Add New Course'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Course Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              required
              placeholder="e.g., CS 101"
            />
            <TextField
              label="Course Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Introduction to Computer Science"
            />
            <TextField
              label="Instructor"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              fullWidth
              placeholder="e.g., Dr. Smith"
            />
            <TextField
              label="Credit Hours"
              type="number"
              value={formData.creditHours}
              onChange={(e) => setFormData({ ...formData, creditHours: parseInt(e.target.value) })}
              fullWidth
              inputProps={{ min: 0, max: 6 }}
            />
            <TextField
              label="Semester"
              select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              fullWidth
            >
              <MenuItem value="Spring">Spring</MenuItem>
              <MenuItem value="Summer">Summer</MenuItem>
              <MenuItem value="Fall">Fall</MenuItem>
              <MenuItem value="Winter">Winter</MenuItem>
            </TextField>
            <TextField
              label="Year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              fullWidth
              inputProps={{ min: 2020, max: 2030 }}
            />
            <TextField
              label="Color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCourse ? 'Update' : 'Add'} Course
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}