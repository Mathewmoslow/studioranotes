import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import {
  Close,
  AccessTime,
  LocationOn,
  School,
  Description,
  CheckCircle,
  Schedule,
  CalendarToday
} from '@mui/icons-material';
import { format } from 'date-fns';
import { CalendarBlock, CALENDAR_BLOCK_COLORS, BLOCK_TYPE_LABELS } from '../../types/calendar';

interface CalendarBlockModalProps {
  open: boolean;
  onClose: () => void;
  block: CalendarBlock | null;
  courseName?: string;
  onComplete?: (blockId: string) => void;
  onEdit?: (block: CalendarBlock) => void;
  onDelete?: (blockId: string) => void;
}

export const CalendarBlockModal: React.FC<CalendarBlockModalProps> = ({
  open,
  onClose,
  block,
  courseName,
  onComplete,
  onEdit,
  onDelete
}) => {
  if (!block) return null;
  
  const colors = CALENDAR_BLOCK_COLORS[block.type];
  const label = BLOCK_TYPE_LABELS[block.type];
  
  const handleComplete = () => {
    if (onComplete) {
      onComplete(block.id);
      onClose();
    }
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(block);
      onClose();
    }
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(block.id);
      onClose();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'visible'
        }
      }}
    >
      {/* Header with colored accent */}
      <Box
        sx={{
          height: 6,
          background: `linear-gradient(90deg, ${colors.border}, ${colors.text})`,
          borderRadius: '12px 12px 0 0'
        }}
      />
      
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={label}
              size="small"
              sx={{
                backgroundColor: colors.bg,
                color: colors.text,
                borderColor: colors.border,
                border: '1px solid',
                fontWeight: 600,
                fontSize: '11px'
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {block.title}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {/* Time Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Date & Time
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {format(new Date(block.startTime), 'EEEE, MMMM d, yyyy')}
              </Typography>
              <Typography variant="body2" color="text.primary">
                {format(new Date(block.startTime), 'h:mm a')} - {format(new Date(block.endTime), 'h:mm a')}
              </Typography>
            </Box>
          </Box>
          
          {/* Course Information */}
          {courseName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <School sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Course
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {courseName}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Location */}
          {block.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocationOn sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {block.location}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Description */}
          {block.description && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Description sx={{ color: 'text.secondary', fontSize: 20, mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">
                  {block.description}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Material for exams/quizzes */}
          {block.material && (block.type === 'exam' || block.type === 'quiz') && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Schedule sx={{ color: 'text.secondary', fontSize: 20, mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Material to be tested
                </Typography>
                <Typography variant="body1">
                  {block.material}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Completion Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle 
              sx={{ 
                color: block.completed ? 'success.main' : 'text.disabled', 
                fontSize: 20 
              }} 
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 500,
                  color: block.completed ? 'success.main' : 'text.primary'
                }}
              >
                {block.completed ? 'Completed' : 'Not completed'}
                {block.completedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {format(new Date(block.completedAt), 'MMM d, h:mm a')}
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {onDelete && block.isManual && (
          <Button
            onClick={handleDelete}
            color="error"
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
        )}
        {onEdit && (
          <Button
            onClick={handleEdit}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Edit
          </Button>
        )}
        {onComplete && !block.completed && (
          <Button
            onClick={handleComplete}
            variant="contained"
            startIcon={<CheckCircle />}
            sx={{
              borderRadius: 2,
              backgroundColor: colors.border,
              '&:hover': {
                backgroundColor: colors.text
              }
            }}
          >
            Mark Complete
          </Button>
        )}
        {block.completed && (
          <Chip
            label="Completed"
            icon={<CheckCircle />}
            color="success"
            variant="outlined"
          />
        )}
      </DialogActions>
    </Dialog>
  );
};