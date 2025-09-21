import React, { useState, useMemo, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  IconButton,
  Stack,
  Grid,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  ViewWeek,
  ViewDay,
  CalendarMonth,
  Add
} from '@mui/icons-material';
import { format, startOfWeek, addDays, isSameDay, isToday, addHours } from 'date-fns';
import { useScheduleStore } from '../../stores/useScheduleStore';
import { CalendarBlock, CalendarBlockType, BLOCK_TYPE_LABELS } from '../../types/calendar';
import { DraggableCalendarColumn } from './DraggableCalendar';
import { CalendarBlockModal } from './CalendarBlockModal';

type ViewType = 'week' | 'day' | 'month';

export const EnhancedSchedulerView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const { timeBlocks, tasks, events, courses, updateTimeBlock, completeTask } = useScheduleStore();
  
  const startHour = 5; // 5 AM
  const endHour = 23; // 11 PM
  const hourHeight = 60; // pixels per hour
  
  // Convert existing data to CalendarBlocks
  const convertToCalendarBlocks = useCallback((): CalendarBlock[] => {
    const blocks: CalendarBlock[] = [];
    
    // Convert events to blocks
    events.forEach(event => {
      let blockType: CalendarBlockType = 'lecture';
      
      if (event.type === 'deadline') blockType = 'due';
      else if (event.type === 'exam') blockType = 'exam';
      else if (event.type === 'clinical') blockType = 'clinical';
      else if (event.type === 'lecture') blockType = 'lecture';
      
      blocks.push({
        id: event.id,
        type: blockType,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        courseId: event.courseId,
        taskId: event.taskId,
        location: event.location,
        description: event.description,
        completed: false,
        isDraggable: false
      });
    });
    
    // Convert time blocks to calendar blocks
    timeBlocks.forEach(block => {
      const task = tasks.find(t => t.id === block.taskId);
      let blockType: CalendarBlockType = 'do';
      
      if (task) {
        if (task.type === 'reading') blockType = 'read';
        else if (task.type === 'video') blockType = 'watch';
        else if (task.type === 'quiz') blockType = 'quiz';
        else if (task.type === 'exam') blockType = 'e-review';
        else if (block.type === 'review') blockType = 'l-review';
      }
      
      blocks.push({
        id: block.id,
        type: blockType,
        title: task?.title || block.title || 'Study Block',
        startTime: block.startTime,
        endTime: block.endTime,
        courseId: task?.courseId,
        taskId: block.taskId,
        completed: block.completed || false,
        isDraggable: !block.isManual,
        description: task?.description
      });
    });
    
    return blocks;
  }, [events, timeBlocks, tasks]);
  
  const calendarBlocks = useMemo(() => convertToCalendarBlocks(), [convertToCalendarBlocks]);
  
  const getDaysToDisplay = () => {
    switch (viewType) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      default:
        return [];
    }
  };
  
  const days = getDaysToDisplay();
  
  const getBlocksForDay = (day: Date) => {
    return calendarBlocks.filter(block => 
      isSameDay(new Date(block.startTime), day)
    );
  };
  
  const getCourseNameForBlock = (block: CalendarBlock) => {
    if (!block.courseId) return undefined;
    const course = courses.find(c => c.id === block.courseId);
    return course?.name;
  };
  
  const handleBlockClick = (block: CalendarBlock) => {
    setSelectedBlock(block);
    setModalOpen(true);
  };
  
  const handleBlockComplete = (blockId: string) => {
    const block = calendarBlocks.find(b => b.id === blockId);
    if (block) {
      if (block.taskId) {
        completeTask(block.taskId);
      }
      // Update the time block completion status
      const timeBlock = timeBlocks.find(tb => tb.id === blockId);
      if (timeBlock) {
        updateTimeBlock(blockId, { ...timeBlock, completed: !timeBlock.completed });
      }
    }
  };
  
  const handleBlockDrop = (blockId: string, date: Date, hour: number) => {
    const block = calendarBlocks.find(b => b.id === blockId);
    if (!block || !block.isDraggable) return;
    
    const newStartTime = addHours(date, hour);
    const duration = (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / (1000 * 60 * 60);
    const newEndTime = addHours(newStartTime, duration);
    
    // Update the time block
    const timeBlock = timeBlocks.find(tb => tb.id === blockId);
    if (timeBlock) {
      updateTimeBlock(blockId, {
        ...timeBlock,
        startTime: newStartTime,
        endTime: newEndTime
      });
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
    }
  };
  
  const getDateRangeText = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      default:
        return '';
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 1.5 }}>
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, backgroundColor: 'background.paper' }}>
        {/* Header */}
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={600}>
              Schedule
            </Typography>
            
            <Stack direction="row" spacing={1}>
              {/* View Type Selector */}
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Day View">
                  <Button
                    onClick={() => setViewType('day')}
                    variant={viewType === 'day' ? 'contained' : 'outlined'}
                  >
                    <ViewDay />
                  </Button>
                </Tooltip>
                <Tooltip title="Week View">
                  <Button
                    onClick={() => setViewType('week')}
                    variant={viewType === 'week' ? 'contained' : 'outlined'}
                  >
                    <ViewWeek />
                  </Button>
                </Tooltip>
                <Tooltip title="Month View">
                  <Button
                    onClick={() => setViewType('month')}
                    variant={viewType === 'month' ? 'contained' : 'outlined'}
                    disabled
                  >
                    <CalendarMonth />
                  </Button>
                </Tooltip>
              </ButtonGroup>
              
              {/* Today Button */}
              <Button
                startIcon={<Today />}
                onClick={() => setCurrentDate(new Date())}
                variant="outlined"
                size="small"
              >
                Today
              </Button>
            </Stack>
          </Stack>
          
          {/* Date Navigation */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigateDate(-1)} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: 250, textAlign: 'center' }}>
              {getDateRangeText()}
            </Typography>
            <IconButton onClick={() => navigateDate(1)} size="small">
              <ChevronRight />
            </IconButton>
          </Stack>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Calendar Grid */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
          {/* Time Labels */}
          <Box sx={{ width: 60, flexShrink: 0 }}>
            <Box sx={{ height: 40 }} /> {/* Header spacer */}
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i).map(hour => (
              <Box
                key={hour}
                sx={{
                  height: hourHeight,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  pr: 1
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Day Columns */}
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flex: 1, minWidth: 150 }}>
              {/* Day Header */}
              <Box
                sx={{
                  height: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '2px solid',
                  borderColor: isToday(day) ? 'primary.main' : 'divider',
                  backgroundColor: isToday(day) ? 'primary.50' : 'transparent'
                }}
              >
                <Typography
                  variant="caption"
                  color={isToday(day) ? 'primary' : 'text.secondary'}
                  fontWeight={500}
                >
                  {format(day, 'EEE')}
                </Typography>
                <Typography
                  variant="body2"
                  color={isToday(day) ? 'primary' : 'text.primary'}
                  fontWeight={isToday(day) ? 600 : 400}
                >
                  {format(day, 'd')}
                </Typography>
              </Box>
              
              {/* Calendar Column with Blocks */}
              <DraggableCalendarColumn
                date={day}
                blocks={getBlocksForDay(day)}
                onBlockClick={handleBlockClick}
                onBlockComplete={handleBlockComplete}
                onBlockDrop={handleBlockDrop}
                getCourseNameForBlock={getCourseNameForBlock}
                hourHeight={hourHeight}
                startHour={startHour}
                endHour={endHour}
              />
            </Box>
          ))}
        </Box>
      </Paper>
      
      {/* Block Details Modal */}
      <CalendarBlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        block={selectedBlock}
        courseName={selectedBlock ? getCourseNameForBlock(selectedBlock) : undefined}
        onComplete={handleBlockComplete}
      />
    </Container>
  );
};

export default EnhancedSchedulerView;