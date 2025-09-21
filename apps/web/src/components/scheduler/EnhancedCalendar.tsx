import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import { Event, TimeBlock, Task, Course } from '@studioranotes/types';

interface CalendarBlockProps {
  event?: Event;
  block?: TimeBlock;
  task?: Task;
  course?: Course;
  style?: React.CSSProperties;
}

// Task type color mapping
const TASK_TYPE_COLORS = {
  assignment: { bg: 'rgba(52,199,89,0.1)', color: '#34C759', label: 'Assignment' },
  exam: { bg: 'rgba(255,59,48,0.1)', color: '#FF3B30', label: 'Exam' },
  reading: { bg: 'rgba(0,122,255,0.1)', color: '#007AFF', label: 'Read' },
  study: { bg: 'rgba(138,86,240,0.1)', color: '#8A56F0', label: 'Study' },
  project: { bg: 'rgba(255,149,0,0.1)', color: '#FF9500', label: 'Project' },
  lab: { bg: 'rgba(50,215,75,0.1)', color: '#32D74B', label: 'Lab' },
  lecture: { bg: 'rgba(88,86,214,0.1)', color: '#5856D6', label: 'Lecture' },
  clinical: { bg: 'rgba(175,82,222,0.1)', color: '#AF52DE', label: 'Clinical' },
  simulation: { bg: 'rgba(255,69,58,0.1)', color: '#FF453A', label: 'Sim' },
  tutorial: { bg: 'rgba(48,176,199,0.1)', color: '#30B0C7', label: 'Tutorial' },
  quiz: { bg: 'rgba(255,214,10,0.1)', color: '#FFD60A', label: 'Quiz' },
  video: { bg: 'rgba(255,107,157,0.1)', color: '#FF6B9D', label: 'Video' },
  vsim: { bg: 'rgba(196,69,105,0.1)', color: '#C44569', label: 'vSim' },
  remediation: { bg: 'rgba(248,181,0,0.1)', color: '#F8B500', label: 'Remediation' },
  admin: { bg: 'rgba(149,165,166,0.1)', color: '#95A5A6', label: 'Admin' },
  prep: { bg: 'rgba(78,205,196,0.1)', color: '#4ECDC4', label: 'Prep' },
  drill: { bg: 'rgba(46,204,113,0.1)', color: '#2ECC71', label: 'Drill' },
  review: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', label: 'Review' },
};

// Course color palette
const COURSE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#DDA0DD', '#F4A460', '#9370DB', '#20B2AA'
];

export const CalendarBlock: React.FC<CalendarBlockProps> = ({ 
  event, 
  block, 
  task, 
  course,
  style 
}) => {
  const getCourseColor = (courseId?: string) => {
    if (!courseId) return COURSE_COLORS[0];
    const index = parseInt(courseId.slice(-1)) % COURSE_COLORS.length;
    return COURSE_COLORS[index];
  };

  const getBlockContent = () => {
    // DUE Block (deadline)
    if (event?.type === 'deadline') {
      const taskType = task?.type || 'assignment';
      const typeInfo = TASK_TYPE_COLORS[taskType] || TASK_TYPE_COLORS.assignment;
      const courseColor = getCourseColor(event.courseId);
      
      return {
        title: `DUE: ${event.title}`,
        subtitle: course?.name || '',
        icon: '📅',
        style: {
          background: `linear-gradient(135deg, ${typeInfo.bg}, rgba(255,59,48,0.05))`,
          borderLeft: `4px solid ${courseColor}`,
          borderTop: `2px solid #FF3B30`,
          borderRight: `2px solid #FF3B30`,
          borderBottom: `2px solid #FF3B30`,
        },
        typeLabel: typeInfo.label,
        typeColor: typeInfo.color,
      };
    }
    
    // DO Block (study/work)
    if (block) {
      const taskType = task?.type || 'study';
      const typeInfo = TASK_TYPE_COLORS[taskType] || TASK_TYPE_COLORS.study;
      const courseColor = getCourseColor(task?.courseId);
      
      // Generate descriptive content based on task type
      let description = '';
      if (taskType === 'reading') {
        description = task?.description || 'Complete reading assignment';
      } else if (taskType === 'study') {
        description = 'Review materials';
      } else if (taskType === 'prep') {
        description = 'Prepare for upcoming class';
      } else {
        description = task?.description || 'Work on task';
      }
      
      return {
        title: `${typeInfo.label}: ${task?.title || 'Study Block'}`,
        subtitle: description,
        icon: '📚',
        style: {
          background: typeInfo.bg,
          borderLeft: `4px solid ${courseColor}`,
          border: `2px solid ${typeInfo.color}`,
        },
        typeLabel: typeInfo.label,
        typeColor: typeInfo.color,
      };
    }
    
    // Lecture Block (recurring)
    if (event?.type === 'lecture') {
      const courseColor = getCourseColor(event.courseId);
      
      return {
        title: `Lecture: ${course?.name}`,
        subtitle: event.location || 'Classroom',
        icon: '🏫',
        style: {
          background: 'linear-gradient(135deg, rgba(88,86,214,0.1), rgba(88,86,214,0.05))',
          borderLeft: `4px solid ${courseColor}`,
          border: '2px dashed #5856D6',
        },
        typeLabel: 'Lecture',
        typeColor: '#5856D6',
      };
    }
    
    // Default event
    const taskType = event?.type || 'assignment';
    const typeInfo = TASK_TYPE_COLORS[taskType] || TASK_TYPE_COLORS.assignment;
    const courseColor = getCourseColor(event?.courseId);
    
    return {
      title: event?.title || 'Event',
      subtitle: course?.name || '',
      icon: '📌',
      style: {
        background: typeInfo.bg,
        borderLeft: `4px solid ${courseColor}`,
        border: `2px solid ${typeInfo.color}`,
      },
      typeLabel: typeInfo.label,
      typeColor: typeInfo.color,
    };
  };

  const content = getBlockContent();
  const startTime = event?.startTime || block?.startTime;
  const endTime = event?.endTime || block?.endTime;
  
  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {content.title}
          </Typography>
          {content.subtitle && (
            <Typography variant="caption" display="block">
              {content.subtitle}
            </Typography>
          )}
          {course && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Course: {course.name}
            </Typography>
          )}
          {startTime && endTime && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {format(new Date(startTime), 'h:mm a')} - {format(new Date(endTime), 'h:mm a')}
            </Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
    >
      <Box
        sx={{
          position: 'relative',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          minHeight: '60px',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
          },
          ...content.style,
          ...style,
        }}
      >
        {/* Type Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: `1px solid ${content.typeColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <Typography
            sx={{
              fontSize: '10px',
              fontWeight: 600,
              color: content.typeColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {content.typeLabel}
          </Typography>
        </Box>
        
        {/* Main Content */}
        <Box>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#0A0A0B',
              lineHeight: 1.3,
              marginBottom: '2px',
              paddingRight: '60px', // Space for type badge
            }}
            noWrap
          >
            {content.title}
          </Typography>
          
          {content.subtitle && (
            <Typography
              sx={{
                fontSize: '11px',
                color: '#6E6E73',
                lineHeight: 1.2,
              }}
              noWrap
            >
              {content.subtitle}
            </Typography>
          )}
          
          {/* Time Display */}
          {startTime && (
            <Typography
              sx={{
                fontSize: '10px',
                color: '#6E6E73',
                marginTop: '4px',
                fontWeight: 500,
              }}
            >
              {format(new Date(startTime), 'h:mm a')}
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

// Enhanced calendar grid component
interface CalendarGridProps {
  events: Event[];
  blocks: TimeBlock[];
  tasks: Task[];
  courses: Course[];
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  events,
  blocks,
  tasks,
  courses,
  currentDate,
  viewType,
}) => {
  // Calculate responsive grid layout
  const calculateBlockPosition = (startTime: Date, endTime: Date) => {
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    const duration = endHour - startHour;
    
    // Map to percentage of day (5 AM to 11 PM = 18 hours)
    const dayStart = 5; // 5 AM
    const dayEnd = 23; // 11 PM
    const dayDuration = dayEnd - dayStart;
    
    const top = ((startHour - dayStart) / dayDuration) * 100;
    const height = (duration / dayDuration) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };
  
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: viewType === 'week' ? 'repeat(7, 1fr)' : '1fr',
        gap: '1px',
        backgroundColor: '#E8E8ED',
        borderRadius: '12px',
        overflow: 'hidden',
        minHeight: '600px',
        maxHeight: '80vh',
        position: 'relative',
      }}
    >
      {/* Render calendar grid cells */}
      {/* Implementation details would go here */}
    </Box>
  );
};

export default CalendarBlock;