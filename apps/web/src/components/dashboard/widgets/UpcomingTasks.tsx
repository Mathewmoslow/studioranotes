'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  IconButton,
  Button,
  alpha,
  useTheme,
} from '@mui/material'
import {
  CheckCircle,
  RadioButtonUnchecked,
  Add,
  CalendarToday,
  Assignment,
  Quiz,
  MenuBook,
} from '@mui/icons-material'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'

interface Task {
  id: string
  title: string
  course: string
  type: 'assignment' | 'quiz' | 'reading' | 'study' | 'exam' | 'project'
  dueDate: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  originalTask?: any
}

export default function UpcomingTasks() {
  const theme = useTheme()
  const { tasks: storeTasks, courses, updateTask, getUpcomingTasks } = useScheduleStore()

  // Get upcoming tasks from store and transform them
  const upcomingTasks = React.useMemo(() => {
    const upcoming = getUpcomingTasks(14) // Get tasks for next 2 weeks

    return upcoming.map(task => {
      // Find the course for this task
      const course = courses.find(c => c.id === task.courseId)

      // Calculate priority based on due date
      let priority: 'high' | 'medium' | 'low' = 'low'
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue <= 2) priority = 'high'
      else if (daysUntilDue <= 5) priority = 'medium'

      // Format due date
      let dueDateText = ''
      if (daysUntilDue === 0) dueDateText = 'Today'
      else if (daysUntilDue === 1) dueDateText = 'Tomorrow'
      else if (daysUntilDue < 7) dueDateText = `In ${daysUntilDue} days`
      else dueDateText = format(task.dueDate, 'MMM d')

      // Map task type
      let mappedType: Task['type'] = 'assignment'
      if (task.type === 'exam' || task.type === 'quiz') mappedType = 'quiz'
      else if (task.type === 'reading') mappedType = 'reading'
      else if (task.type === 'project') mappedType = 'assignment'
      else if (task.type === 'study') mappedType = 'study'

      return {
        id: task.id,
        title: task.title,
        course: course?.code || course?.name || 'Unknown',
        type: mappedType,
        dueDate: dueDateText,
        completed: task.status === 'completed',
        priority,
        originalTask: task
      }
    }).slice(0, 8) // Show max 8 tasks
  }, [storeTasks, courses, getUpcomingTasks])

  const handleToggleTask = (taskId: string) => {
    const task = upcomingTasks.find(t => t.id === taskId)
    if (task && task.originalTask) {
      updateTask(taskId, {
        status: task.completed ? 'pending' : 'completed'
      })
    }
  }

  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'assignment':
        return <Assignment />
      case 'quiz':
        return <Quiz />
      case 'reading':
        return <MenuBook />
      case 'study':
        return <CalendarToday />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'success'
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Upcoming Tasks
        </Typography>
        <IconButton size="small">
          <Add />
        </IconButton>
      </Box>

      <List sx={{ mx: -3, px: 3 }}>
        {upcomingTasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No upcoming tasks. Import courses from Canvas to see assignments.
            </Typography>
          </Box>
        ) : (
          upcomingTasks.map((task, index) => (
            <ListItem
            key={task.id}
            sx={{
              px: 0,
              py: 1.5,
              borderBottom: index < upcomingTasks.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
              opacity: task.completed ? 0.6 : 1,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.02),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Checkbox
                edge="start"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                icon={<RadioButtonUnchecked />}
                checkedIcon={<CheckCircle />}
                sx={{
                  color: task.completed ? 'success.main' : 'text.secondary',
                  '&.Mui-checked': {
                    color: 'success.main',
                  },
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      fontWeight: 500,
                    }}
                  >
                    {task.title}
                  </Typography>
                  <Chip
                    label={task.course}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              }
              secondaryTypographyProps={{
                component: 'div',
                sx: { mt: 0.5 }
              }}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getTaskIcon(task.type)}
                    <Typography variant="caption" color="text.secondary">
                      {task.type}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    • {task.dueDate}
                  </Typography>
                  <Chip
                    label={task.priority}
                    size="small"
                    color={getPriorityColor(task.priority)}
                    sx={{
                      height: 16,
                      fontSize: 10,
                      '& .MuiChip-label': {
                        px: 0.5,
                      },
                    }}
                  />
                </Box>
              }
            />
          </ListItem>
          ))
        )}
      </List>

      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {upcomingTasks.filter(t => t.completed).length} of {upcomingTasks.length} completed
          </Typography>
          <Button size="small" sx={{ textTransform: 'none' }}>
            View Calendar
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}