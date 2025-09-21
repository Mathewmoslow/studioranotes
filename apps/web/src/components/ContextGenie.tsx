'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  Paper,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  AutoAwesome,
  ExpandMore,
  Assignment,
  Warning,
  CheckCircle,
  Info,
  Schedule,
  Description,
  Announcement,
  Forum,
  Close,
  TipsAndUpdates,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useScheduleStore } from '@/stores/useScheduleStore'

interface ContextGenieProps {
  open: boolean
  onClose: () => void
  course: any
}

interface ExtractedTask {
  title: string
  type: string
  dueDate: string | null
  recurring: boolean
  description: string
  source: string
  confidence: 'high' | 'medium' | 'low'
  estimatedHours: number
  selected?: boolean
}

export default function ContextGenie({ open, onClose, course }: ContextGenieProps) {
  const { addTask, tasks } = useScheduleStore()
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [customText, setCustomText] = useState('')
  const [step, setStep] = useState<'input' | 'review'>('input')

  const handleExtract = async () => {
    setLoading(true)
    try {
      // Get existing assignments to avoid duplicates
      const existingAssignments = tasks
        .filter(t => t.courseId === course.id)
        .map(t => ({
          name: t.title,
          dueDate: t.dueDate
        }))

      const response = await fetch('/api/canvas/extract-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.name,
          syllabus: course.syllabus,
          announcements: course.announcements || [],
          discussions: course.discussions || [],
          moduleDescriptions: course.modules?.map((m: any) => ({
            name: m.name,
            description: m.description || ''
          })) || [],
          assignmentDescriptions: course.assignments?.map((a: any) => ({
            name: a.name,
            description: a.description || ''
          })) || [],
          existingAssignments,
          customText: customText // Allow manual input of email/announcement text
        })
      })

      if (response.ok) {
        const data = await response.json()
        setExtractedData(data.extracted)

        // Pre-select high confidence tasks
        const highConfidence = new Set<number>()
        data.extracted.tasks?.forEach((task: ExtractedTask, index: number) => {
          if (task.confidence === 'high') {
            highConfidence.add(index)
          }
        })
        setSelectedTasks(highConfidence)
        setStep('review')
      }
    } catch (error) {
      console.error('Failed to extract context:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSelectedTasks = () => {
    extractedData?.tasks?.forEach((task: ExtractedTask, index: number) => {
      if (selectedTasks.has(index)) {
        addTask({
          id: `extracted-${Date.now()}-${index}`,
          title: task.title,
          courseId: course.id,
          type: task.type as any,
          dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
          status: 'pending',
          priority: task.confidence === 'high' ? 2 : 1,
          estimatedTime: task.estimatedHours * 60,
          description: `${task.description}\n\nSource: ${task.source}`,
          fromContextGenie: true
        })
      }
    })

    onClose()
  }

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'success'
      case 'medium': return 'warning'
      case 'low': return 'error'
      default: return 'default'
    }
  }

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('syllabus')) return <Description />
    if (source.toLowerCase().includes('announcement')) return <Announcement />
    if (source.toLowerCase().includes('discussion')) return <Forum />
    return <Assignment />
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TipsAndUpdates sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Context Genie</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {step === 'input' ? (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                The Context Genie finds hidden assignments and deadlines from:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Syllabus patterns (weekly readings, recurring quizzes)</li>
                <li>Announcements mentioning informal deadlines</li>
                <li>Discussion posts with clarifications</li>
                <li>Hidden requirements in assignment descriptions</li>
              </ul>
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Available sources for {course.name}:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {course.syllabus && <Chip icon={<CheckCircle />} label="Syllabus" color="success" size="small" />}
                {course.announcements?.length > 0 && <Chip icon={<CheckCircle />} label={`${course.announcements.length} Announcements`} color="success" size="small" />}
                {course.modules?.length > 0 && <Chip icon={<CheckCircle />} label={`${course.modules.length} Modules`} color="success" size="small" />}
                {!course.syllabus && !course.announcements?.length && !course.modules?.length && (
                  <Chip icon={<Warning />} label="Limited data available" color="warning" size="small" />
                )}
              </Stack>
            </Paper>

            <TextField
              label="Additional Context (Optional)"
              placeholder="Paste any emails, announcements, or notes from your professor here..."
              multiline
              rows={4}
              fullWidth
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              helperText="Add any text that might contain hidden deadlines or requirements"
              sx={{ mb: 3 }}
            />

            {loading && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Analyzing course materials...
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            {extractedData?.warnings?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Important Notes:</Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {extractedData.warnings.map((warning: string, i: number) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Found {extractedData?.tasks?.length || 0} potential tasks:
            </Typography>

            <List>
              {extractedData?.tasks?.map((task: ExtractedTask, index: number) => (
                <Paper key={index} variant="outlined" sx={{ mb: 1 }}>
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedTasks.has(index)}
                        onChange={() => toggleTask(index)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2">{task.title}</Typography>
                          <Chip
                            label={task.confidence}
                            color={getConfidenceColor(task.confidence)}
                            size="small"
                          />
                          {task.recurring && <Chip label="Recurring" size="small" />}
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {task.description}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {getSourceIcon(task.source)}
                              <Typography variant="caption">{task.source}</Typography>
                            </Stack>
                            {task.dueDate && (
                              <Typography variant="caption">
                                Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                              </Typography>
                            )}
                            <Typography variant="caption">
                              ~{task.estimatedHours}h effort
                            </Typography>
                          </Stack>
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>

            {extractedData?.patterns?.length > 0 && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">
                    Recurring Patterns ({extractedData.patterns.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {extractedData.patterns.map((pattern: any, i: number) => (
                      <ListItem key={i}>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText
                          primary={pattern.pattern}
                          secondary={`${pattern.frequency} • ${pattern.importance} importance`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'input' ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<AutoAwesome />}
              onClick={handleExtract}
              disabled={loading}
            >
              Extract Hidden Tasks
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep('input')}>Back</Button>
            <Button
              variant="contained"
              onClick={handleAddSelectedTasks}
              disabled={selectedTasks.size === 0}
            >
              Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}