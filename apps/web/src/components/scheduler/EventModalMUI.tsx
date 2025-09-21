import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Divider,
  Alert,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  School as SchoolIcon,
  Star,
  StarBorder,
  Assignment as TaskIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { Event } from '@studioranotes/types';
import { format } from 'date-fns';
import { useScheduleStore } from '../../stores/useScheduleStore';

interface EventModalProps {
  event: Event | null;
  timeBlock: any | null;
  courses: any[];
  onClose: () => void;
}

const EventModalMUI: React.FC<EventModalProps> = ({ event, timeBlock, courses, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    type: ''
  });
  
  const { 
    updateEvent, 
    deleteEvent, 
    updateTask, 
    deleteTask, 
    deleteTimeBlock, 
    completeTask, 
    toggleEventComplete, 
    toggleTimeBlockComplete 
  } = useScheduleStore();
  
  if (!event && !timeBlock) return null;
  
  const getCourse = (courseId: string) => {
    return courses.find(c => c.id === courseId);
  };
  
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return '#dc2626';
      case 'clinical': return '#7c3aed';
      case 'lab': return '#f59e0b';
      case 'simulation': return '#06b6d4';
      case 'lecture': return '#6b7280';
      case 'review': return '#10b981';
      case 'deadline': return '#ef4444';
      default: return '#3b82f6';
    }
  };
  
  const handleEdit = () => {
    if (event) {
      setEditForm({
        title: event.title,
        startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
        location: event.location || '',
        description: event.description || '',
        type: event.type
      });
    } else if (timeBlock) {
      setEditForm({
        title: timeBlock.task?.title || 'Study Session',
        startTime: format(new Date(timeBlock.block.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(timeBlock.block.endTime), "yyyy-MM-dd'T'HH:mm"),
        location: '',
        description: timeBlock.task?.description || '',
        type: ''
      });
    }
    setIsEditing(true);
  };
  
  const handleSave = () => {
    if (event) {
      updateEvent(event.id, {
        title: editForm.title,
        startTime: new Date(editForm.startTime),
        endTime: new Date(editForm.endTime),
        location: editForm.location,
        description: editForm.description,
        type: editForm.type as any
      });
    }
    setIsEditing(false);
    onClose();
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this?')) {
      if (event) {
        deleteEvent(event.id);
      } else if (timeBlock) {
        deleteTimeBlock(timeBlock.block.id);
      }
      onClose();
    }
  };
  
  const handleComplete = () => {
    if (event) {
      toggleEventComplete(event.id);
      onClose();
    } else if (timeBlock?.block) {
      toggleTimeBlockComplete(timeBlock.block.id);
      if (timeBlock?.task) {
        completeTask(timeBlock.task.id);
      }
      onClose();
    }
  };
  
  const item = event || timeBlock?.block;
  const task = timeBlock?.task;
  const course = event ? getCourse(event.courseId) : task ? getCourse(task.courseId) : null;
  const isCompleted = event?.completed || timeBlock?.block?.completed;
  
  const headerColor = event ? getEventTypeColor(event.type) : '#10b981';
  
  if (isEditing) {
    return (
      <Dialog 
        open={true} 
        onClose={() => setIsEditing(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: headerColor, 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Edit {event ? 'Event' : 'Study Block'}</Typography>
          <IconButton onClick={() => setIsEditing(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            <TextField
              label="Title"
              fullWidth
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            
            <TextField
              label="Course"
              fullWidth
              value={`${course?.name || 'Unknown'} (${course?.code || 'N/A'})`}
              disabled
            />
            
            {event && (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editForm.type}
                  label="Type"
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                >
                  <MenuItem value="lecture">Lecture</MenuItem>
                  <MenuItem value="clinical">Clinical</MenuItem>
                  <MenuItem value="lab">Lab</MenuItem>
                  <MenuItem value="exam">Exam</MenuItem>
                  <MenuItem value="simulation">Simulation</MenuItem>
                  <MenuItem value="review">Review</MenuItem>
                </Select>
              </FormControl>
            )}
            
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="datetime-local"
                fullWidth
                value={editForm.startTime}
                onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time"
                type="datetime-local"
                fullWidth
                value={editForm.endTime}
                onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            
            {event && (
              <TextField
                label="Location"
                fullWidth
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g., Room 101, Lab B"
              />
            )}
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setIsEditing(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: headerColor }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: headerColor, 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 2
      }}>
        <Box>
          <Typography variant="h6">
            {event ? event.title : task?.title || 'Study Session'}
          </Typography>
          <Chip
            label={event ? event.type : 'Study Block'}
            size="small"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              mt: 1,
              fontWeight: 500
            }}
          />
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 3 }}>
        {isCompleted && (
          <Alert severity="success" sx={{ mb: 2 }}>
            This {event ? 'event' : 'study session'} has been completed
          </Alert>
        )}
        
        <Stack spacing={2}>
          {/* Course Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">Course:</Typography>
            <Typography variant="body2" fontWeight={500}>
              {course?.name || 'Unknown'} ({course?.code || 'N/A'})
            </Typography>
          </Box>
          
          {/* Time Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">Time:</Typography>
            <Typography variant="body2" fontWeight={500}>
              {format(new Date(item.startTime), 'h:mm a')} - {format(new Date(item.endTime), 'h:mm a')}
            </Typography>
          </Box>
          
          {/* Date Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">Date:</Typography>
            <Typography variant="body2" fontWeight={500}>
              {format(new Date(item.startTime), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
          
          {/* Location Info */}
          {event?.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">Location:</Typography>
              <Typography variant="body2" fontWeight={500}>
                {event.location}
              </Typography>
            </Box>
          )}
          
          {/* Task Complexity */}
          {task && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TaskIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">Complexity:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  i < (task.complexity || 1) 
                    ? <Star key={i} sx={{ fontSize: 16, color: '#f59e0b' }} />
                    : <StarBorder key={i} sx={{ fontSize: 16, color: '#d1d5db' }} />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Description */}
          {(event?.description || task?.description) && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description:
                </Typography>
                <Typography variant="body2">
                  {event?.description || task?.description}
                </Typography>
              </Box>
            </>
          )}
          
          {/* Study Tips for Time Blocks */}
          {timeBlock && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Study Session Tips:
                </Typography>
                <Stack spacing={1} sx={{ ml: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • Take a 5-minute break every 25 minutes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Keep water nearby to stay hydrated
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Review your notes before starting
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Test yourself with practice questions
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleDelete}
          color="error"
          startIcon={<DeleteIcon />}
        >
          Delete
        </Button>
        <Button
          onClick={handleEdit}
          color="inherit"
          startIcon={<EditIcon />}
        >
          Edit
        </Button>
        {!isCompleted && (
          <Button
            onClick={handleComplete}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
          >
            Mark Complete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EventModalMUI;