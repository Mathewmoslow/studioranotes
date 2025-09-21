import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Circle as CircleIcon,
  Assignment as AssignmentIcon,
  MenuBook as ReadingIcon,
  Science as LabIcon,
  Computer as ProjectIcon,
  Quiz as QuizIcon,
  VideoLibrary as VideoIcon,
  School as LectureIcon,
  LocalHospital as ClinicalIcon,
  Psychology as SimulationIcon,
  CalendarToday as DeadlineIcon
} from '@mui/icons-material';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface CalendarLegendProps {
  courses: Course[];
  selectedCourseId?: string;
  onCourseClick?: (courseId: string) => void;
  compact?: boolean;
}

const TASK_TYPES = [
  { type: 'assignment', label: 'Assignment', icon: AssignmentIcon, color: '#34C759' },
  { type: 'exam', label: 'Exam', icon: QuizIcon, color: '#FF3B30' },
  { type: 'reading', label: 'Reading', icon: ReadingIcon, color: '#007AFF' },
  { type: 'project', label: 'Project', icon: ProjectIcon, color: '#FF9500' },
  { type: 'lab', label: 'Lab', icon: LabIcon, color: '#32D74B' },
  { type: 'lecture', label: 'Lecture', icon: LectureIcon, color: '#5856D6' },
  { type: 'clinical', label: 'Clinical', icon: ClinicalIcon, color: '#AF52DE' },
  { type: 'simulation', label: 'Simulation', icon: SimulationIcon, color: '#FF453A' },
  { type: 'quiz', label: 'Quiz', icon: QuizIcon, color: '#FFD60A' },
  { type: 'video', label: 'Video', icon: VideoIcon, color: '#FF6B9D' },
  { type: 'deadline', label: 'Deadline', icon: DeadlineIcon, color: '#dc2626' }
];

export const CalendarLegend: React.FC<CalendarLegendProps> = ({
  courses,
  selectedCourseId,
  onCourseClick,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const theme = useTheme();

  const handleCourseClick = (courseId: string) => {
    if (onCourseClick) {
      onCourseClick(courseId === selectedCourseId ? '' : courseId);
    }
  };

  if (compact) {
    return (
      <Paper 
        elevation={2}
        sx={{ 
          p: 1.5,
          mb: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Calendar Legend
          </Typography>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* Courses Section */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                COURSES
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {courses.map(course => (
                  <Chip
                    key={course.id}
                    label={course.code}
                    size="small"
                    icon={<CircleIcon sx={{ fontSize: 12 }} />}
                    onClick={() => handleCourseClick(course.id)}
                    sx={{
                      backgroundColor: selectedCourseId === course.id 
                        ? course.color 
                        : alpha(course.color, 0.2),
                      color: selectedCourseId === course.id 
                        ? theme.palette.getContrastText(course.color)
                        : course.color,
                      borderColor: course.color,
                      border: '1px solid',
                      '& .MuiChip-icon': {
                        color: course.color
                      },
                      '&:hover': {
                        backgroundColor: alpha(course.color, 0.3)
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            {/* Task Types Section */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                TASK TYPES
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {TASK_TYPES.map(({ type, label, icon: Icon, color }) => (
                  <Chip
                    key={type}
                    label={label}
                    size="small"
                    icon={<Icon sx={{ fontSize: 16 }} />}
                    sx={{
                      backgroundColor: alpha(color, 0.1),
                      color: color,
                      borderColor: color,
                      border: '1px solid',
                      fontSize: '0.75rem',
                      height: 24,
                      '& .MuiChip-icon': {
                        color: color
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </Collapse>
      </Paper>
    );
  }

  // Full size legend for sidebar
  return (
    <Paper 
      elevation={3}
      sx={{ 
        p: 2,
        height: 'fit-content',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
      }}
    >
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Calendar Legend
      </Typography>

      <Stack spacing={1.5}>
        {/* Courses Section */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
            COURSES
          </Typography>
          <Stack spacing={1}>
            {courses.map(course => (
              <Box
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundColor: selectedCourseId === course.id 
                    ? alpha(course.color, 0.1)
                    : 'transparent',
                  border: selectedCourseId === course.id 
                    ? `2px solid ${course.color}`
                    : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: alpha(course.color, 0.05)
                  }
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: course.color,
                    flexShrink: 0
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {course.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {course.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Task Types Section */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
            TASK TYPES
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {TASK_TYPES.map(({ type, label, icon: Icon, color }) => (
              <Box
                key={type}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  borderRadius: 1,
                  backgroundColor: alpha(color, 0.05),
                  border: `1px solid ${alpha(color, 0.3)}`
                }}
              >
                <Icon sx={{ fontSize: 18, color }} />
                <Typography variant="caption" fontWeight={500}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider />

        {/* Visual Indicators */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
            VISUAL INDICATORS
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 20, 
                backgroundColor: alpha(theme.palette.primary.main, 0.8),
                borderRadius: 0.5
              }} />
              <Typography variant="caption">High opacity = High priority (Exams)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 20, 
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                borderRadius: 0.5
              }} />
              <Typography variant="caption">Low opacity = Low priority (Readings)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 20, 
                border: `2px dashed ${theme.palette.primary.main}`,
                borderRadius: 0.5
              }} />
              <Typography variant="caption">Dashed = Flexible timing</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 20, 
                border: `3px double ${theme.palette.primary.main}`,
                borderRadius: 0.5
              }} />
              <Typography variant="caption">Double = Multi-part task</Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default CalendarLegend;