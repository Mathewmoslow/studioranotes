import React from 'react';
import { Box, Typography, Chip, Tooltip, alpha } from '@mui/material';
import { format } from 'date-fns';
import {
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  LocalHospital as ClinicalIcon,
  Science as LabIcon,
  Computer as OnlineIcon,
  Flag as FlagIcon,
  Schedule as ScheduleIcon,
  MenuBook as StudyIcon,
  Quiz as QuizIcon,
  Description as ExamIcon,
  AutoStories,
} from '@mui/icons-material';

interface BlockProps {
  block: any;
  task?: any;
  course?: any;
  type: 'DO' | 'DUE' | 'CLASS' | 'CLINICAL';
}

const EnhancedCalendarBlock: React.FC<BlockProps> = ({ block, task, course, type }) => {
  // Determine priority level and color
  const getPriorityColor = () => {
    if (!task) return 'default';
    const daysUntilDue = Math.floor((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 1) return '#ef4444'; // Red - urgent
    if (daysUntilDue < 3) return '#f97316'; // Orange - high priority  
    if (daysUntilDue < 7) return '#eab308'; // Yellow - medium priority
    return '#10b981'; // Green - low priority
  };

  const getTypeIcon = () => {
    if (type === 'CLINICAL') return <ClinicalIcon sx={{ fontSize: 16 }} />;
    if (type === 'CLASS') return <SchoolIcon sx={{ fontSize: 16 }} />;
    if (type === 'DUE') return <WarningIcon sx={{ fontSize: 16 }} />;
    
    // For DO blocks, show task type icon
    if (task) {
      switch (task.type) {
        case 'exam': return <ExamIcon sx={{ fontSize: 16 }} />;
        case 'quiz': return <QuizIcon sx={{ fontSize: 16 }} />;
        case 'lab': return <LabIcon sx={{ fontSize: 16 }} />;
        case 'reading': return <AutoStories sx={{ fontSize: 16 }} />;
        case 'assignment': return <AssignmentIcon sx={{ fontSize: 16 }} />;
        default: return <StudyIcon sx={{ fontSize: 16 }} />;
      }
    }
    return <ScheduleIcon sx={{ fontSize: 16 }} />;
  };

  const getBlockStyle = () => {
    const baseColor = course?.color || '#6366f1';
    const priorityColor = getPriorityColor();
    
    let background = baseColor;
    let borderStyle = '2px solid';
    let borderColor = baseColor;
    let pattern = 'none';

    if (type === 'DO') {
      // DO blocks have diagonal stripes pattern
      background = `repeating-linear-gradient(
        45deg,
        ${alpha(baseColor, 0.15)},
        ${alpha(baseColor, 0.15)} 10px,
        ${alpha(baseColor, 0.25)} 10px,
        ${alpha(baseColor, 0.25)} 20px
      )`;
      borderColor = baseColor;
      borderStyle = '2px solid';
    } else if (type === 'DUE') {
      // DUE blocks have solid background with priority border
      background = alpha(baseColor, 0.2);
      borderColor = priorityColor;
      borderStyle = '3px solid';
    } else if (type === 'CLASS') {
      // Class blocks have solid color
      background = alpha(baseColor, 0.3);
      borderColor = baseColor;
      borderStyle = '2px solid';
    } else if (type === 'CLINICAL') {
      // Clinical blocks have cross-hatch pattern
      background = `repeating-linear-gradient(
        45deg,
        ${alpha(baseColor, 0.2)},
        ${alpha(baseColor, 0.2)} 10px,
        transparent 10px,
        transparent 20px
      ),
      repeating-linear-gradient(
        -45deg,
        ${alpha(baseColor, 0.2)},
        ${alpha(baseColor, 0.2)} 10px,
        transparent 10px,
        transparent 20px
      )`;
      borderColor = baseColor;
      borderStyle = '2px dashed';
    }

    return {
      background,
      borderLeft: `4px solid ${priorityColor}`,
      borderTop: borderStyle + ' ' + borderColor,
      borderRight: borderStyle + ' ' + borderColor,
      borderBottom: borderStyle + ' ' + borderColor,
      borderRadius: '4px',
      padding: '8px',
      position: 'relative' as const,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }
    };
  };

  const getBlockLabel = () => {
    if (type === 'DO') return 'STUDY';
    if (type === 'DUE') return 'DUE';
    if (type === 'CLASS') return 'CLASS';
    if (type === 'CLINICAL') return 'CLINICAL';
    return '';
  };

  const getBlockBadgeColor = () => {
    if (type === 'DO') return 'info';
    if (type === 'DUE') return 'error';
    if (type === 'CLASS') return 'primary';
    if (type === 'CLINICAL') return 'secondary';
    return 'default';
  };

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {task?.title || block.title || 'Block'}
          </Typography>
          <Typography variant="caption" display="block">
            {course?.name} ({course?.code})
          </Typography>
          {task && (
            <>
              <Typography variant="caption" display="block">
                Due: {format(new Date(task.dueDate), 'MMM d, h:mm a')}
              </Typography>
              <Typography variant="caption" display="block">
                Complexity: {'⭐'.repeat(task.complexity)}
              </Typography>
            </>
          )}
        </Box>
      }
    >
      <Box sx={getBlockStyle()}>
        {/* Type Badge */}
        <Chip
          label={getBlockLabel()}
          size="small"
          color={getBlockBadgeColor()}
          icon={getTypeIcon()}
          sx={{
            position: 'absolute',
            top: 2,
            right: 4,
            height: 20,
            fontSize: '0.65rem',
            '& .MuiChip-label': {
              px: 0.5,
            }
          }}
        />

        {/* Priority Indicator */}
        {task && type === 'DO' && (
          <Box
            sx={{
              position: 'absolute',
              top: 2,
              left: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: getPriorityColor(),
              boxShadow: '0 0 4px ' + getPriorityColor(),
            }}
          />
        )}

        {/* Main Content */}
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#1a1a1a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task?.title || block.title || 'Study Block'}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: '#666',
              display: 'block',
              mt: 0.5,
            }}
          >
            {course?.code} • {format(new Date(block.startTime), 'h:mm a')}
          </Typography>

          {/* Completion Status for DO blocks */}
          {type === 'DO' && block.completed !== undefined && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {block.completed ? (
                <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} />
              ) : (
                <TimerIcon sx={{ fontSize: 14, color: '#6b7280' }} />
              )}
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {block.completed ? 'Completed' : 'Pending'}
              </Typography>
            </Box>
          )}

          {/* Online Indicator */}
          {block.isOnline && (
            <Chip
              icon={<OnlineIcon />}
              label="Online"
              size="small"
              sx={{
                mt: 1,
                height: 18,
                fontSize: '0.7rem',
                backgroundColor: alpha('#3b82f6', 0.1),
                color: '#3b82f6',
              }}
            />
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

export default EnhancedCalendarBlock;