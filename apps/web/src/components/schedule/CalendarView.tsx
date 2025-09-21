'use client'

import React, { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  useTheme,
  alpha,
  Stack,
  Tooltip,
  Card,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Today,
  ViewWeek,
  ViewModule,
  Add,
  Refresh,
  Settings,
  BatteryChargingFull,
  Assignment,
  Quiz,
  MenuBook,
  CalendarToday,
} from '@mui/icons-material'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  addDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns'
import { useScheduleStore } from '@/stores/useScheduleStore'

type ViewMode = 'week' | 'month'

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'task' | 'event' | 'block' | 'break'
  color: string
  courseId?: string
}

export default function CalendarView() {
  const theme = useTheme()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const {
    tasks,
    events,
    timeBlocks,
    courses,
    generateSmartSchedule,
    energyPatterns
  } = useScheduleStore()

  // Get week boundaries
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Convert all data to calendar events
  const calendarEvents = useMemo(() => {
    const allEvents: CalendarEvent[] = []

    // Add time blocks (study sessions)
    timeBlocks.forEach(block => {
      const task = tasks.find(t => t.id === block.taskId)
      const course = task ? courses.find(c => c.id === task.courseId) : null

      allEvents.push({
        id: `block-${block.id}`,
        title: task?.title || 'Study Session',
        start: block.startTime instanceof Date ? block.startTime : new Date(block.startTime),
        end: block.endTime instanceof Date ? block.endTime : new Date(block.endTime),
        type: 'block',
        color: course?.color || theme.palette.primary.main,
        courseId: course?.id
      })
    })

    // Add events (lectures, exams, etc.)
    events.forEach(event => {
      const course = courses.find(c => c.id === event.courseId)

      allEvents.push({
        id: `event-${event.id}`,
        title: event.title,
        start: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
        end: event.endTime instanceof Date ? event.endTime : new Date(event.endTime),
        type: 'event',
        color: event.type === 'exam' ? theme.palette.error.main :
               event.type === 'deadline' ? theme.palette.warning.main :
               course?.color || theme.palette.secondary.main,
        courseId: course?.id
      })
    })

    // Add task deadlines as visual indicators
    tasks.forEach(task => {
      const course = courses.find(c => c.id === task.courseId)
      const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)

      allEvents.push({
        id: `task-${task.id}`,
        title: `DUE: ${task.title}`,
        start: new Date(dueDate.setHours(23, 0, 0, 0)),
        end: new Date(dueDate.setHours(23, 59, 59, 999)),
        type: 'task',
        color: theme.palette.error.main,
        courseId: course?.id
      })
    })

    return allEvents
  }, [tasks, events, timeBlocks, courses, theme])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(event =>
      isWithinInterval(event.start, {
        start: startOfDay(day),
        end: endOfDay(day)
      }) ||
      isWithinInterval(event.end, {
        start: startOfDay(day),
        end: endOfDay(day)
      })
    )
  }

  // Get energy level for a specific hour
  const getEnergyForHour = (hour: number) => {
    const pattern = energyPatterns.find(p => p.hour === hour)
    return pattern?.energyLevel || 50
  }

  const handleGenerateSchedule = () => {
    generateSmartSchedule(new Date(), addDays(new Date(), 14))
  }

  const handlePrevWeek = () => {
    setCurrentDate(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentDate(prev => addWeeks(prev, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Hour slots for the day view
  const hourSlots = Array.from({ length: 16 }, (_, i) => i + 7) // 7 AM to 10 PM

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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Schedule
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button
            size="small"
            startIcon={<BatteryChargingFull />}
            onClick={handleGenerateSchedule}
            variant="contained"
          >
            Generate Smart Schedule
          </Button>
          <IconButton onClick={handleToday}>
            <Today />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handlePrevWeek}>
          <ChevronLeft />
        </IconButton>

        <Typography variant="h6" sx={{ mx: 2 }}>
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </Typography>

        <IconButton onClick={handleNextWeek}>
          <ChevronRight />
        </IconButton>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={viewMode === 'week' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('week')}
            startIcon={<ViewWeek />}
          >
            Week
          </Button>
          <Button
            size="small"
            variant={viewMode === 'month' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('month')}
            startIcon={<ViewModule />}
            disabled
          >
            Month
          </Button>
        </Box>
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ display: 'flex', height: 'calc(100% - 140px)', overflow: 'hidden' }}>
        {/* Time Column */}
        <Box sx={{ width: 60, flexShrink: 0, pr: 1 }}>
          <Box sx={{ height: 40, mb: 1 }} /> {/* Header spacer */}
          {hourSlots.map(hour => (
            <Box
              key={hour}
              sx={{
                height: 60,
                display: 'flex',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </Typography>

              {/* Energy indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 2,
                  width: 20,
                  height: 4,
                  borderRadius: 1,
                  bgcolor: alpha(
                    getEnergyForHour(hour) > 70 ? theme.palette.success.main :
                    getEnergyForHour(hour) > 40 ? theme.palette.warning.main :
                    theme.palette.error.main,
                    0.3
                  ),
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Days Grid */}
        <Box sx={{ flex: 1, display: 'flex', gap: 0.5, overflow: 'auto' }}>
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day)
            const isCurrentDay = isToday(day)

            return (
              <Box
                key={day.toISOString()}
                sx={{
                  flex: 1,
                  minWidth: 120,
                  bgcolor: isCurrentDay ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
                }}
              >
                {/* Day Header */}
                <Box
                  sx={{
                    height: 40,
                    p: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: isCurrentDay ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    align="center"
                    color={isCurrentDay ? 'primary' : 'textPrimary'}
                    fontWeight={isCurrentDay ? 600 : 400}
                  >
                    {format(day, 'EEE')}
                  </Typography>
                  <Typography
                    variant="h6"
                    align="center"
                    color={isCurrentDay ? 'primary' : 'textPrimary'}
                    fontWeight={isCurrentDay ? 600 : 400}
                  >
                    {format(day, 'd')}
                  </Typography>
                </Box>

                {/* Day Events */}
                <Box sx={{ position: 'relative', height: hourSlots.length * 60 }}>
                  {/* Hour grid lines */}
                  {hourSlots.map((hour, index) => (
                    <Box
                      key={hour}
                      sx={{
                        position: 'absolute',
                        top: index * 60,
                        left: 0,
                        right: 0,
                        height: 60,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map(event => {
                    const startHour = event.start.getHours()
                    const startMinutes = event.start.getMinutes()
                    const endHour = event.end.getHours()
                    const endMinutes = event.end.getMinutes()

                    const top = ((startHour - 7) * 60) + startMinutes
                    const height = ((endHour - startHour) * 60) + (endMinutes - startMinutes)

                    if (startHour < 7 || startHour > 22) return null

                    return (
                      <Card
                        key={event.id}
                        sx={{
                          position: 'absolute',
                          top: Math.max(0, top),
                          left: 2,
                          right: 2,
                          height: Math.min(height, 960 - top),
                          p: 0.5,
                          bgcolor: alpha(event.color, event.type === 'block' ? 0.8 : 0.6),
                          border: `1px solid ${alpha(event.color, 0.3)}`,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          '&:hover': {
                            bgcolor: alpha(event.color, 0.9),
                            zIndex: 10,
                          },
                        }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 500,
                            color: theme.palette.getContrastText(event.color),
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.title}
                        </Typography>
                        {height > 30 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              color: alpha(theme.palette.getContrastText(event.color), 0.7),
                            }}
                          >
                            {format(event.start, 'h:mm a')}
                          </Typography>
                        )}
                      </Card>
                    )
                  })}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Paper>
  )
}