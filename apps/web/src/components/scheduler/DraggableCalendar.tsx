import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Checkbox,
  Tooltip,
  Card
} from '@mui/material';
import {
  CheckCircleOutline,
  RadioButtonUnchecked,
  DragIndicator,
  AccessTime,
  LocationOn
} from '@mui/icons-material';
import { format } from 'date-fns';
import { CalendarBlock, CALENDAR_BLOCK_COLORS, BLOCK_TYPE_LABELS } from '../../types/calendar';

interface DraggableCalendarBlockProps {
  block: CalendarBlock;
  onBlockClick: (block: CalendarBlock) => void;
  onBlockComplete: (blockId: string) => void;
  courseName?: string;
  isDragging?: boolean;
}

export const DraggableCalendarBlock: React.FC<DraggableCalendarBlockProps> = ({
  block,
  onBlockClick,
  onBlockComplete,
  courseName,
  isDragging = false
}) => {
  const [isCompleted, setIsCompleted] = useState(block.completed || false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const blockRef = useRef<HTMLDivElement>(null);
  
  const colors = CALENDAR_BLOCK_COLORS[block.type];
  const label = BLOCK_TYPE_LABELS[block.type];
  
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleted(!isCompleted);
    onBlockComplete(block.id);
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!block.isDraggable && !block.isManual) return;
    
    const rect = blockRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.setData('blockType', block.type);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset any drag state
  };
  
  return (
    <Card
      ref={blockRef}
      draggable={block.isDraggable !== false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onBlockClick(block)}
      sx={{
        position: 'relative',
        p: 1,
        mb: 0.5,
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        cursor: block.isDraggable !== false ? 'move' : 'pointer',
        opacity: isCompleted ? 0.6 : 1,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateX(2px)',
          boxShadow: 1,
          '& .drag-handle': {
            opacity: 1
          }
        },
        ...(isDragging && {
          opacity: 0.5,
          transform: 'scale(1.02)'
        })
      }}
    >
      {/* Drag Handle */}
      {block.isDraggable !== false && (
        <DragIndicator
          className="drag-handle"
          sx={{
            position: 'absolute',
            left: -2,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 16,
            color: colors.border,
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        />
      )}
      
      {/* Completion Checkbox */}
      <IconButton
        size="small"
        onClick={handleComplete}
        sx={{
          position: 'absolute',
          right: 4,
          top: 2,
          p: 0.25
        }}
      >
        {isCompleted ? (
          <CheckCircleOutline sx={{ fontSize: 16, color: colors.text }} />
        ) : (
          <RadioButtonUnchecked sx={{ fontSize: 16, color: colors.text }} />
        )}
      </IconButton>
      
      {/* Block Content */}
      <Box sx={{ pr: 1.5 }}>
        {/* Type Label and Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: colors.text,
              fontSize: '10px',
              letterSpacing: '0.5px'
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {format(new Date(block.startTime), 'h:mm a')}
            </Typography>
          </Box>
        </Box>
        
        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
            lineHeight: 1.2,
            mb: 0.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {block.title}
        </Typography>
        
        {/* Course Name */}
        {courseName && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '11px'
            }}
          >
            {courseName}
          </Typography>
        )}
        
        {/* Location */}
        {block.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <LocationOn sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {block.location}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

interface DraggableCalendarColumnProps {
  date: Date;
  blocks: CalendarBlock[];
  onBlockClick: (block: CalendarBlock) => void;
  onBlockComplete: (blockId: string) => void;
  onBlockDrop: (blockId: string, date: Date, hour: number) => void;
  getCourseNameForBlock: (block: CalendarBlock) => string | undefined;
  hourHeight: number;
  startHour: number;
  endHour: number;
}

export const DraggableCalendarColumn: React.FC<DraggableCalendarColumnProps> = ({
  date,
  blocks,
  onBlockClick,
  onBlockComplete,
  onBlockDrop,
  getCourseNameForBlock,
  hourHeight,
  startHour,
  endHour
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  
  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setDragOverHour(hour);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
    setDragOverHour(null);
  };
  
  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('blockId');
    if (blockId) {
      onBlockDrop(blockId, date, hour);
    }
    setIsDragOver(false);
    setDragOverHour(null);
  };
  
  const hours = Array.from(
    { length: endHour - startHour + 1 }, 
    (_, i) => startHour + i
  );
  
  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: hourHeight * hours.length }}>
      {/* Hour slots for dropping */}
      {hours.map((hour) => (
        <Box
          key={hour}
          onDragOver={(e) => handleDragOver(e, hour)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, hour)}
          sx={{
            position: 'absolute',
            top: (hour - startHour) * hourHeight,
            left: 0,
            right: 0,
            height: hourHeight,
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            backgroundColor: isDragOver && dragOverHour === hour 
              ? 'rgba(0, 122, 255, 0.05)' 
              : 'transparent',
            transition: 'background-color 0.2s'
          }}
        />
      ))}
      
      {/* Render blocks */}
      {blocks.map((block) => {
        const startTime = new Date(block.startTime);
        const endTime = new Date(block.endTime);
        const startHourFloat = startTime.getHours() + startTime.getMinutes() / 60;
        const endHourFloat = endTime.getHours() + endTime.getMinutes() / 60;
        const duration = endHourFloat - startHourFloat;
        
        const top = (startHourFloat - startHour) * hourHeight;
        const height = duration * hourHeight;
        
        return (
          <Box
            key={block.id}
            sx={{
              position: 'absolute',
              top: `${top}px`,
              left: 2,
              right: 2,
              height: `${height}px`,
              minHeight: 40
            }}
          >
            <DraggableCalendarBlock
              block={block}
              onBlockClick={onBlockClick}
              onBlockComplete={onBlockComplete}
              courseName={getCourseNameForBlock(block)}
            />
          </Box>
        );
      })}
    </Box>
  );
};