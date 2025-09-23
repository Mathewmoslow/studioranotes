import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  IconButton,
  Chip,
  Stack,
  Card,
  CardContent,
  Tooltip,
  Grid
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Event as EventIcon,
  School as SchoolIcon,
  Assignment as TaskIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useScheduleStore } from '../../stores/useScheduleStore';
import { Event } from '@studioranotes/types';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import EventModalMUI from './EventModalMUI';
import CalendarLegend from './CalendarLegend';
import { clinicalFilter } from '../../lib/clinicalFilter';

type ViewType = 'week' | 'day' | 'month';

const SchedulerView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  
  const { timeBlocks, tasks, events, courses, updateEvent, updateTimeBlock } = useScheduleStore();
  
  const hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM
  
  const ensureDate = (date: Date | string): Date => {
    return typeof date === 'string' ? new Date(date) : date;
  };
  
  const getDaysToDisplay = () => {
    switch (viewType) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      default:
        return [];
    }
  };
  
  const days = getDaysToDisplay();
  
  const getUniqueEventsForDay = (day: Date) => {
    let dayEvents = events.filter(event => isSameDay(ensureDate(event.startTime), day));
    
    // Filter clinical events to show only actual clinical sessions and deadlines
    dayEvents = dayEvents.filter(event => {
      const course = getCourseForEvent(event);
      const isClinicalCourse = course && (
        course.name.toLowerCase().includes('clinical') ||
        course.code.toLowerCase().includes('clinical')
      );
      
      if (isClinicalCourse) {
        // Only show clinical sessions, exams, and deadlines
        return event.type === 'clinical' || 
               event.type === 'exam' || 
               event.type === 'deadline' ||
               event.title.toLowerCase().includes('reflection');
      }
      
      return true; // Show all non-clinical events
    });
    
    const uniqueEvents = Array.from(
      new Map(dayEvents.map(event => [event.id, event])).values()
    );
    return uniqueEvents;
  };
  
  const getUniqueBlocksForDay = (day: Date) => {
    let dayBlocks = timeBlocks.filter(block => isSameDay(ensureDate(block.startTime), day));
    
    // Filter clinical-related study blocks
    dayBlocks = dayBlocks.filter(block => {
      const task = getTaskForBlock(block.id);
      if (!task) return true;
      
      const course = getCourse(task.courseId);
      const isClinicalCourse = course && (
        course.name.toLowerCase().includes('clinical') ||
        course.code.toLowerCase().includes('clinical')
      );
      
      if (isClinicalCourse) {
        // For clinical courses, only show reflection-related tasks
        return task.title.toLowerCase().includes('reflection') ||
               task.title.toLowerCase().includes('clinical prep') ||
               task.type === 'exam';
      }
      
      return true; // Show all non-clinical blocks
    });
    
    const uniqueBlocks = Array.from(
      new Map(dayBlocks.map(block => [block.id, block])).values()
    );
    return uniqueBlocks;
  };
  
  const getTaskForBlock = (blockId: string) => {
    const block = timeBlocks.find(b => b.id === blockId);
    return tasks.find(t => t.id === block?.taskId);
  };
  
  const getCourseForEvent = (event: Event) => {
    return courses.find(c => c.id === event.courseId);
  };
  
  const getCourse = (courseId: string) => {
    return courses.find(c => c.id === courseId);
  };
  
  const getEventColor = (event: Event) => {
    const course = getCourseForEvent(event);

    // Always use course color if available
    if (course?.color) {
      return course.color;
    }

    // Fallback colors for different event types when no course color
    switch (event.type) {
      case 'deadline': return '#ef4444'; // Bright red for deadlines
      case 'exam': return '#dc2626'; // Dark red for exams
      case 'clinical': return '#7c3aed'; // Purple for clinical
      case 'lab': return '#f59e0b'; // Amber for labs
      case 'simulation': return '#06b6d4'; // Cyan for simulations
      case 'lecture': return '#6b7280'; // Gray for lectures
      case 'review': return '#10b981'; // Green for review
      default: return '#3b82f6'; // Blue default
    }
  };
  
  const navigateDate = (direction: number) => {
    switch (viewType) {
      case 'day':
        setCurrentDate(addDays(currentDate, direction));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, direction * 7));
        break;
      case 'month':
        setCurrentDate(addDays(currentDate, direction * 30));
        break;
    }
  };

  // Detect and handle overlapping events - only group actually overlapping items
  const detectOverlaps = (items: any[]) => {
    const sortedItems = [...items].sort((a, b) => {
      const aStart = ensureDate(a.startTime).getTime();
      const bStart = ensureDate(b.startTime).getTime();
      return aStart - bStart;
    });

    // Group items into overlap clusters
    const overlapGroups: any[][] = [];
    const processedItems = new Set();
    
    sortedItems.forEach(item => {
      if (processedItems.has(item.id || item)) return;
      
      const itemStart = ensureDate(item.startTime).getTime();
      const itemEnd = ensureDate(item.endTime).getTime();
      
      // Find all items that overlap with this one
      const overlappingItems = [item];
      processedItems.add(item.id || item);
      
      // Check for items that overlap with any item in the group
      let i = 0;
      while (i < overlappingItems.length) {
        const currentItem = overlappingItems[i];
        const currentStart = ensureDate(currentItem.startTime).getTime();
        const currentEnd = ensureDate(currentItem.endTime).getTime();
        
        sortedItems.forEach(otherItem => {
          if (processedItems.has(otherItem.id || otherItem)) return;
          
          const otherStart = ensureDate(otherItem.startTime).getTime();
          const otherEnd = ensureDate(otherItem.endTime).getTime();
          
          // Check if items overlap
          if ((otherStart < currentEnd && otherEnd > currentStart)) {
            overlappingItems.push(otherItem);
            processedItems.add(otherItem.id || otherItem);
          }
        });
        i++;
      }
      
      if (overlappingItems.length > 0) {
        overlapGroups.push(overlappingItems);
      }
    });
    
    // Assign positions within each overlap group
    const itemsWithPositions = new Map();
    
    overlapGroups.forEach(group => {
      if (group.length === 1) {
        // No overlap, full width
        itemsWithPositions.set(group[0].id || group[0], {
          ...group[0],
          column: 0,
          totalColumns: 1
        });
      } else {
        // Assign columns within the group
        const columns: any[][] = [];
        
        group.forEach(item => {
          const itemStart = ensureDate(item.startTime).getTime();
          const itemEnd = ensureDate(item.endTime).getTime();
          
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            let canPlace = true;
            
            for (const colItem of column) {
              const colStart = ensureDate(colItem.startTime).getTime();
              const colEnd = ensureDate(colItem.endTime).getTime();
              
              if (itemStart < colEnd && itemEnd > colStart) {
                canPlace = false;
                break;
              }
            }
            
            if (canPlace) {
              column.push(item);
              placed = true;
              break;
            }
          }
          
          if (!placed) {
            columns.push([item]);
          }
        });
        
        // Assign positions
        columns.forEach((column, colIndex) => {
          column.forEach(item => {
            itemsWithPositions.set(item.id || item, {
              ...item,
              column: colIndex,
              totalColumns: columns.length
            });
          });
        });
      }
    });
    
    return itemsWithPositions;
  };

  // Filter events and blocks based on selected course
  const filterByCourse = (items: any[], courseField = 'courseId') => {
    if (!selectedCourseId) return items;
    return items.filter(item => item[courseField] === selectedCourseId);
  };
  
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };
  
  const handleBlockClick = (block: any) => {
    const task = getTaskForBlock(block.id);
    setSelectedTimeBlock({ block, task });
  };
  
  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: any, type: 'event' | 'block') => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ ...item, type });
    // Add visual feedback
    (e.target as HTMLElement).style.opacity = '0.5';
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedItem(null);
    setDragOverDate(null);
    setDragOverHour(null);
  };
  
  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(day);
    setDragOverHour(hour);
  };
  
  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    // Calculate new start time based on drop position
    const newStartTime = new Date(day);
    newStartTime.setHours(hour, 0, 0, 0);
    
    // Calculate duration
    const originalStart = ensureDate(draggedItem.startTime);
    const originalEnd = ensureDate(draggedItem.endTime);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newEndTime = new Date(newStartTime.getTime() + duration);
    
    // Update the item based on type
    if (draggedItem.type === 'event') {
      updateEvent(draggedItem.id, {
        startTime: newStartTime,
        endTime: newEndTime
      });
    } else if (draggedItem.type === 'block') {
      updateTimeBlock(draggedItem.id, {
        startTime: newStartTime,
        endTime: newEndTime
      });
    }
    
    // Reset drag state
    setDraggedItem(null);
    setDragOverDate(null);
    setDragOverHour(null);
  };
  
  const WeekDayView = () => {
    const days = getDaysToDisplay();
    
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto', maxHeight: '80vh' }}>
        <Box sx={{ display: 'flex' }}>
          {/* Time Column */}
          <Box sx={{ width: '80px', flexShrink: 0 }}>
            <Box sx={{ height: 40 }} /> {/* Spacer for day headers */}
            {hours.map(hour => (
              <Box key={hour} sx={{ height: 60, display: 'flex', alignItems: 'center', pr: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Days */}
          <Box sx={{ flex: 1, display: 'flex' }}>
              {days.map(day => {
                const allDayEvents = getUniqueEventsForDay(day);
                const allDayBlocks = getUniqueBlocksForDay(day);
                
                // Filter by selected course
                const dayEvents = filterByCourse(allDayEvents);
                const dayBlocks = filterByCourse(allDayBlocks.map(block => {
                  const task = getTaskForBlock(block.id);
                  return { ...block, courseId: task?.courseId };
                }));
                
                // Combine and detect overlaps
                const allItems = [...dayEvents, ...dayBlocks];
                const itemsWithPositions = detectOverlaps(allItems);
                
                const columnWidth = viewType === 'day' ? '100%' : `${100 / 7}%`;
                
                return (
                  <Box sx={{ width: columnWidth, minWidth: 0 }} key={day.toISOString()}>
                    {/* Day Header */}
                    <Box sx={{ 
                      height: 40, 
                      borderBottom: '1px solid',
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isToday(day) ? 'primary.light' : 'background.paper',
                      color: isToday(day) ? 'white' : 'text.primary',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" fontWeight={500}>
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="body2" fontWeight={isToday(day) ? 600 : 400}>
                        {format(day, 'd')}
                      </Typography>
                    </Box>
                    
                    {/* Day Grid */}
                    <Box sx={{ position: 'relative', borderLeft: '1px solid', borderColor: 'divider' }}>
                      {hours.map(hour => (
                        <Box 
                          key={hour} 
                          sx={{ 
                            height: 60, 
                            borderBottom: '1px solid', 
                            borderColor: 'divider',
                            backgroundColor: dragOverDate && isSameDay(dragOverDate, day) && dragOverHour === hour + 5 
                              ? 'action.hover' 
                              : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                          onDragOver={(e) => handleDragOver(e, day, hour + 5)}
                          onDrop={(e) => handleDrop(e, day, hour + 5)}
                        />
                      ))}
                      
                      {/* Events */}
                      {dayEvents.map(event => {
                        const positionData = itemsWithPositions.get(event.id || event);
                        const startTime = ensureDate(event.startTime);
                        const endTime = ensureDate(event.endTime);
                        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                        const duration = endHour - startHour;
                        const course = getCourseForEvent(event);
                        
                        // Calculate position based on overlaps
                        const column = positionData?.column || 0;
                        const totalColumns = positionData?.totalColumns || 1;
                        const width = `calc(${100 / totalColumns}% - 4px)`;
                        const leftPosition = `${(column * 100) / totalColumns}%`;
                        
                        return (
                          <Tooltip key={event.id} title={`${event.title} - ${course?.name || 'Unknown Course'}`}>
                            <Card
                              draggable
                              onDragStart={(e) => handleDragStart(e, event, 'event')}
                              onDragEnd={handleDragEnd}
                              sx={{
                                position: 'absolute',
                                top: `${(startHour - 6) * 60}px`,
                                height: `${duration * 60 - 4}px`,
                                left: leftPosition,
                                width: width,
                                backgroundColor: getEventColor(event),
                                color: 'white',
                                cursor: 'move',
                                zIndex: event.type === 'deadline' ? 3 : 2,
                                ml: 0.25,
                                mr: 0.25,
                                '&:hover': {
                                  boxShadow: 3,
                                  transform: 'scale(1.02)',
                                  transition: 'all 0.2s'
                                }
                              }}
                              onClick={() => handleEventClick(event)}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Stack spacing={0.5}>
                                <Typography 
                                  variant="caption" 
                                  fontWeight={700} 
                                  noWrap
                                  sx={{ fontSize: '11px', letterSpacing: 0.5 }}
                                >
                                  {event.type === 'exam' ? 'EXAM: ' : 
                                   event.type === 'clinical' ? 'CLINICAL: ' :
                                   event.type === 'lab' ? 'LAB: ' :
                                   event.type === 'lecture' ? '' :
                                   event.type === 'deadline' ? 'DUE: ' : ''}
                                  {event.title}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '10px' }}>
                                  {format(startTime, 'h:mm a')}
                                </Typography>
                                {event.location && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationIcon sx={{ fontSize: 12 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                      {event.location}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        </Tooltip>
                      );
                    })}
                    
                    {/* Study Blocks */}
                    {dayBlocks.map(block => {
                      const positionData = itemsWithPositions.get(block.id || block);
                      const task = getTaskForBlock(block.id);
                      const course = task ? getCourse(task.courseId) : null;
                      const startTime = ensureDate(block.startTime);
                      const endTime = ensureDate(block.endTime);
                      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                      
                      // Calculate position based on overlaps
                      const column = positionData?.column || 0;
                      const totalColumns = positionData?.totalColumns || 1;
                      const width = `calc(${100 / totalColumns}% - 4px)`;
                      const leftPosition = `${(column * 100) / totalColumns}%`;
                      
                      // Use course color for study blocks with pattern for different task types
                      const getBlockStyle = () => {
                        const courseColor = course?.color || '#6b7280';

                        // Create a lighter background version of the course color
                        const lightenColor = (color: string) => {
                          // Convert hex to RGB
                          const r = parseInt(color.slice(1, 3), 16);
                          const g = parseInt(color.slice(3, 5), 16);
                          const b = parseInt(color.slice(5, 7), 16);
                          // Create a lighter version with 15% opacity
                          return `rgba(${r}, ${g}, ${b}, 0.15)`;
                        };

                        const baseStyle = {
                          backgroundColor: lightenColor(courseColor),
                          borderLeft: `4px solid ${courseColor}`,
                          color: '#374151',
                          // Add pattern for study blocks (diagonal stripes)
                          backgroundImage: `repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 10px,
                            rgba(255,255,255,0.1) 10px,
                            rgba(255,255,255,0.1) 20px
                          )`,
                          backgroundSize: 'cover'
                        };

                        // Add specific border styles for different task types
                        if (task?.type === 'exam' || task?.type === 'quiz') {
                          return {
                            ...baseStyle,
                            border: `2px dashed ${courseColor}`,
                            borderLeft: `4px solid ${courseColor}`
                          };
                        }

                        return baseStyle;
                      };
                      
                      const blockStyle = getBlockStyle();
                      
                      // Get task type icon - no emojis
                      const getTaskIcon = () => {
                        return null; // Icons will be replaced with Material UI icons
                      };
                      
                      return (
                        <Tooltip key={block.id} title={`${task?.type || 'Study'}: ${task?.title || 'Study Session'}`}>
                          <Card
                            draggable
                            onDragStart={(e) => handleDragStart(e, block, 'block')}
                            onDragEnd={handleDragEnd}
                            sx={{
                              position: 'absolute',
                              top: `${(startHour - 6) * 60}px`,
                              height: `${duration * 60 - 4}px`,
                              left: leftPosition,
                              width: width,
                              ...blockStyle,
                              cursor: 'move',
                              zIndex: task?.type === 'exam' ? 2 : 1,
                              opacity: block.completed ? 0.7 : 1,
                              ml: 0.25,
                              mr: 0.25,
                              '&:hover': {
                                boxShadow: 2,
                                transform: 'scale(1.02)',
                                transition: 'all 0.2s'
                              }
                            }}
                            onClick={() => handleBlockClick(block)}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Stack spacing={0.5}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography 
                                    variant="caption" 
                                    fontWeight={700} 
                                    noWrap
                                    sx={{ 
                                      textDecoration: task?.status === 'completed' ? 'line-through' : 'none',
                                      opacity: task?.status === 'completed' ? 0.7 : 1,
                                      fontSize: '11px',
                                      letterSpacing: 0.5,
                                      color: 'inherit'
                                    }}
                                  >
                                    {task?.type === 'reading' ? 'READ: ' :
                                     task?.type === 'assignment' ? 'DO: ' :
                                     task?.type === 'exam' ? 'STUDY: ' :
                                     task?.type === 'project' ? 'WORK: ' :
                                     task?.type === 'quiz' ? 'PREP: ' :
                                     task?.type === 'lab' ? 'LAB: ' : 'DO: '}
                                    {task?.title || 'Study Session'}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '10px', color: 'inherit' }}>
                                    {format(startTime, 'h:mm a')}
                                  </Typography>
                                  {block.completed && (
                                    <CheckCircleIcon sx={{ fontSize: 10, color: 'inherit', opacity: 0.8 }} />
                                  )}
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
        </Box>
      </Box>
    </Paper>
    );
  };
  
  const MonthView = () => {
    const weeks = [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    let currentWeekStart = startOfWeek(monthStart);
    
    while (currentWeekStart <= monthEnd) {
      const week = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
      weeks.push(week);
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        {/* Day Headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box key={day} sx={{ p: 1, borderBottom: '2px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="subtitle2" fontWeight={500}>
                {day}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* Month Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map(day => {
                const dayEvents = getUniqueEventsForDay(day);
                const dayBlocks = getUniqueBlocksForDay(day);
                const isCurrentMonth = day >= monthStart && day <= monthEnd;
                
                return (
                  <Box key={day.toISOString()} sx={{
                      minHeight: 100,
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: !isCurrentMonth ? 'grey.50' : isToday(day) ? 'primary.light' : 'background.paper',
                      opacity: !isCurrentMonth ? 0.5 : 1
                    }}>
                      <Typography 
                        variant="body2" 
                        fontWeight={isToday(day) ? 600 : 400}
                        color={isToday(day) ? 'primary.contrastText' : 'text.primary'}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {dayEvents.slice(0, 2).map(event => {
                          const course = getCourseForEvent(event);
                          const startTime = ensureDate(event.startTime);
                          return (
                            <Chip
                              key={event.id}
                              label={`${format(startTime, 'h:mm')} ${event.title}`}
                              size="small"
                              sx={{
                                backgroundColor: getEventColor(event),
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 20
                              }}
                              onClick={() => handleEventClick(event)}
                            />
                          );
                        })}
                        
                        {dayBlocks.slice(0, 1).map(block => {
                          const task = getTaskForBlock(block.id);
                          const prefix = task?.type === 'reading' ? 'READ: ' :
                                       task?.type === 'assignment' ? 'DO: ' :
                                       task?.type === 'project' ? 'WORK: ' : 'DO: ';
                          return (
                            <Chip
                              key={block.id}
                              label={`${prefix}${task?.title || 'Study'}`}
                              size="small"
                              color="secondary"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                              onClick={() => handleBlockClick(block)}
                            />
                          );
                        })}
                        
                        {(dayEvents.length + dayBlocks.length) > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{(dayEvents.length + dayBlocks.length) - 3} more
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Paper>
    );
  };
  
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Schedule
          </Typography>
          
          <ButtonGroup variant="outlined">
            <Button
              variant={viewType === 'day' ? 'contained' : 'outlined'}
              onClick={() => setViewType('day')}
            >
              Day
            </Button>
            <Button
              variant={viewType === 'week' ? 'contained' : 'outlined'}
              onClick={() => setViewType('week')}
            >
              Week
            </Button>
            <Button
              variant={viewType === 'month' ? 'contained' : 'outlined'}
              onClick={() => setViewType('month')}
            >
              Month
            </Button>
          </ButtonGroup>
        </Box>
        
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <IconButton onClick={() => navigateDate(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
            {viewType === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : viewType === 'week'
              ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(addDays(startOfWeek(currentDate), 6), 'MMM d, yyyy')}`
              : format(currentDate, 'EEEE, MMMM d, yyyy')
            }
          </Typography>
          
          <IconButton onClick={() => navigateDate(1)}>
            <ChevronRightIcon />
          </IconButton>
          
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </Box>
        
        {/* Calendar Legend */}
        <CalendarLegend 
          courses={courses}
          selectedCourseId={selectedCourseId}
          onCourseClick={setSelectedCourseId}
          compact={true}
        />
        
        {/* Calendar View */}
        {viewType === 'month' ? <MonthView /> : <WeekDayView />}
        
        {/* Event Modal */}
        {(selectedEvent || selectedTimeBlock) && (
          <EventModalMUI
            event={selectedEvent}
            timeBlock={selectedTimeBlock}
            courses={courses}
            onClose={() => {
              setSelectedEvent(null);
              setSelectedTimeBlock(null);
            }}
          />
        )}
      </Container>
    </Box>
  );
};

export default SchedulerView;