'use client'

import React, { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Button,
  Divider,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material'
import {
  CalendarMonth,
  Schedule,
  Assignment,
  Event,
  School,
  EmojiEvents,
  Delete,
  Edit,
  DragIndicator,
  BatteryFull,
  Battery80,
  Battery50,
  Battery20,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay, isSameDay, isSameHour, addMinutes, differenceInMinutes } from 'date-fns'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { Task, Event as ScheduleEvent, StudyBlock } from '@/types/schedule'
import { useDraggable, useDroppable } from '@dnd-kit/core'

interface DraggableEventProps {
  event: Task | ScheduleEvent | StudyBlock
  type: 'task' | 'event' | 'study'
}

function DraggableEvent({ event, type }: DraggableEventProps) {
  const theme = useTheme()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `${type}-${event.id}`,
    data: { event, type },
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const getEventColor = () => {
    if (type === 'task') return theme.palette.error.main
    if (type === 'event') return theme.palette.primary.main
    return theme.palette.success.main
  }

  const getEventTime = () => {
    if (type === 'task') {
      const task = event as Task
      return task.dueDate ? format(task.dueDate, 'h:mm a') : 'All day'
    }
    if (type === 'event') {
      const scheduleEvent = event as ScheduleEvent
      return format(scheduleEvent.startTime, 'h:mm a')
    }
    const study = event as StudyBlock
    return format(study.startTime, 'h:mm a')
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      sx={{
        p: 1,
        mb: 0.5,
        bgcolor: alpha(getEventColor(), 0.1),
        borderLeft: `3px solid ${getEventColor()}`,
        '&:hover': {
          bgcolor: alpha(getEventColor(), 0.15),
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <DragIndicator
          {...listeners}
          sx={{
            fontSize: 16,
            color: 'text.secondary',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getEventTime()}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

interface DroppableTimeSlotProps {
  day: Date
  hour: number
  children?: React.ReactNode
}

function DroppableTimeSlot({ day, hour, children }: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${format(day, 'yyyy-MM-dd')}-${hour}`,
    data: { day, hour },
  })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 60,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: isOver ? alpha('#4CAF50', 0.1) : 'transparent',
        p: 0.5,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </Box>
  )
}

export default function DraggableCalendarView() {
  const theme = useTheme()
  const { tasks, events, studyBlocks, energyPatterns, updateTask, updateEvent, updateStudyBlock } = useScheduleStore()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const [activeType, activeId] = (active.id as string).split('-')
    const overData = over.data.current as { day: Date; hour: number }

    if (!overData) {
      setActiveId(null)
      return
    }

    // Calculate new time based on drop position
    const newTime = new Date(overData.day)
    newTime.setHours(overData.hour, 0, 0, 0)

    // Update the item based on its type
    if (activeType === 'task') {
      const task = tasks.find(t => t.id === activeId)
      if (task) {
        updateTask(activeId, { ...task, dueDate: newTime })
      }
    } else if (activeType === 'event') {
      const eventItem = events.find(e => e.id === activeId)
      if (eventItem) {
        const duration = differenceInMinutes(eventItem.endTime, eventItem.startTime)
        updateEvent(activeId, {
          ...eventItem,
          startTime: newTime,
          endTime: addMinutes(newTime, duration),
        })
      }
    } else if (activeType === 'study') {
      const study = studyBlocks.find(s => s.id === activeId)
      if (study) {
        const duration = differenceInMinutes(study.endTime, study.startTime)
        updateStudyBlock(activeId, {
          ...study,
          startTime: newTime,
          endTime: addMinutes(newTime, duration),
        })
      }
    }

    setActiveId(null)
  }

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const slotStart = new Date(day)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(day)
    slotEnd.setHours(hour + 1, 0, 0, 0)

    const dayTasks = tasks.filter(task =>
      task.dueDate && isSameDay(task.dueDate, day) && task.dueDate.getHours() === hour
    )

    const dayEvents = events.filter(event =>
      isSameDay(event.startTime, day) && event.startTime.getHours() === hour
    )

    const dayStudyBlocks = studyBlocks.filter(block =>
      isSameDay(block.startTime, day) && block.startTime.getHours() === hour
    )

    return { tasks: dayTasks, events: dayEvents, studyBlocks: dayStudyBlocks }
  }

  const getEnergyIcon = (hour: number) => {
    const energy = energyPatterns[hour] || 50
    if (energy >= 75) return <BatteryFull sx={{ fontSize: 16, color: theme.palette.success.main }} />
    if (energy >= 50) return <Battery80 sx={{ fontSize: 16, color: theme.palette.info.main }} />
    if (energy >= 25) return <Battery50 sx={{ fontSize: 16, color: theme.palette.warning.main }} />
    return <Battery20 sx={{ fontSize: 16, color: theme.palette.error.main }} />
  }

  const activeItem = activeId
    ? [...tasks, ...events, ...studyBlocks].find(item =>
        activeId.includes(item.id)
      )
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={600}>
              Week Calendar (Drag & Drop Enabled)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentWeek(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
              >
                Previous Week
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentWeek(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
              >
                Next Week
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Calendar Grid */}
        <Paper sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ display: 'flex' }}>
            {/* Time column */}
            <Box sx={{ width: 60, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ height: 50, borderBottom: '1px solid', borderColor: 'divider' }} />
              {hours.map(hour => (
                <Box
                  key={hour}
                  sx={{
                    height: 60,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
                  </Typography>
                  {getEnergyIcon(hour)}
                </Box>
              ))}
            </Box>

            {/* Day columns */}
            {weekDays.map(day => (
              <Box key={format(day, 'yyyy-MM-dd')} sx={{ flex: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    height: 50,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    bgcolor: isSameDay(day, new Date()) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  }}
                >
                  <Typography variant="caption" fontWeight={600}>
                    {format(day, 'EEE')}
                  </Typography>
                  <Typography variant="body2">
                    {format(day, 'd')}
                  </Typography>
                </Box>

                {hours.map(hour => {
                  const { tasks: slotTasks, events: slotEvents, studyBlocks: slotStudyBlocks } = getEventsForTimeSlot(day, hour)

                  return (
                    <DroppableTimeSlot key={`${format(day, 'yyyy-MM-dd')}-${hour}`} day={day} hour={hour}>
                      {slotTasks.map(task => (
                        <DraggableEvent key={task.id} event={task} type="task" />
                      ))}
                      {slotEvents.map(event => (
                        <DraggableEvent key={event.id} event={event} type="event" />
                      ))}
                      {slotStudyBlocks.map(block => (
                        <DraggableEvent key={block.id} event={block} type="study" />
                      ))}
                    </DroppableTimeSlot>
                  )
                })}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Legend */}
        <Paper sx={{ p: 1, mt: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Legend:
            </Typography>
            <Chip
              size="small"
              label="Tasks"
              sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), borderLeft: `3px solid ${theme.palette.error.main}` }}
            />
            <Chip
              size="small"
              label="Events"
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderLeft: `3px solid ${theme.palette.primary.main}` }}
            />
            <Chip
              size="small"
              label="Study Blocks"
              sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), borderLeft: `3px solid ${theme.palette.success.main}` }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Drag items to reschedule
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <Paper
            sx={{
              p: 1,
              bgcolor: 'background.paper',
              boxShadow: 4,
              maxWidth: 200,
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {activeItem.title}
            </Typography>
          </Paper>
        )}
      </DragOverlay>
    </DndContext>
  )
}