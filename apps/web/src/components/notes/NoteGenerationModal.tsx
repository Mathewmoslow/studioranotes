'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid2 as Grid,
  Typography,
  Box,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider,
} from '@mui/material'
import {
  AutoAwesome,
  Description,
  School,
  Science,
  MenuBook,
  Assignment,
  QuestionAnswer,
  FormatListBulleted,
  Summarize,
  Psychology,
  GridView,
  HelpOutline,
} from '@mui/icons-material'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { useUnifiedStore } from '@/stores/useUnifiedStore'

interface NoteGenerationModalProps {
  open: boolean
  onClose: () => void
  initialContext?: string
  initialTopic?: string
  courseName?: string
}

// Original NotesAI formats
const NOTE_STYLES = [
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Extremely detailed notes covering all aspects',
    icon: <MenuBook />
  },
  {
    value: 'concise',
    label: 'Concise',
    description: 'Brief, focused on key concepts only',
    icon: <Summarize />
  },
  {
    value: 'exploratory',
    label: 'Exploratory',
    description: 'Includes questions and areas to explore',
    icon: <Psychology />
  },
  {
    value: 'guided',
    label: 'Guided',
    description: 'Structured with study tips and guidance',
    icon: <School />
  },
  {
    value: 'flexible',
    label: 'Flexible',
    description: 'Balanced and adaptable format',
    icon: <AutoAwesome />
  },
]

const NOTE_TYPES = [
  { value: 'outline', label: 'Outline', icon: <FormatListBulleted /> },
  { value: 'summary', label: 'Summary', icon: <Summarize /> },
  { value: 'flashcards', label: 'Flashcards', icon: <QuestionAnswer /> },
  { value: 'concept_map', label: 'Concept Map', icon: <GridView /> },
  { value: 'qa', label: 'Q&A', icon: <HelpOutline /> },
]

const NOTE_CONTEXTS = [
  { value: 'pre-lecture', label: 'Pre-Lecture', icon: <Description /> },
  { value: 'lecture', label: 'Lecture', icon: <School /> },
  { value: 'post-lecture', label: 'Post-Lecture', icon: <Assignment /> },
  { value: 'textbook', label: 'Textbook', icon: <MenuBook /> },
  { value: 'clinical', label: 'Clinical', icon: <Science /> },
  { value: 'lab', label: 'Laboratory', icon: <Science /> },
  { value: 'assignment', label: 'Assignment', icon: <Assignment /> },
  { value: 'study-guide', label: 'Study Guide', icon: <Description /> },
]

export default function NoteGenerationModal({
  open,
  onClose,
  initialContext = 'lecture',
  initialTopic = '',
  courseName: initialCourseName = ''
}: NoteGenerationModalProps) {
  const { courses } = useScheduleStore()
  const { setGeneratingNote, setNoteGenerationProgress } = useUnifiedStore()

  const [formData, setFormData] = useState({
    courseName: initialCourseName,
    topic: initialTopic,
    context: initialContext,
    style: 'comprehensive',
    type: 'outline',
    sourceText: '',
    existingNotes: '',
    additionalContext: '',
  })

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedNote, setGeneratedNote] = useState<any>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setGeneratingNote(true)
    setNoteGenerationProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setNoteGenerationProgress((prev: number) => Math.min(prev + 10, 90))
      }, 300)

      const response = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      clearInterval(progressInterval)
      setNoteGenerationProgress(100)

      if (!response.ok) {
        throw new Error('Failed to generate note')
      }

      const data = await response.json()
      setGeneratedNote(data.note)

      // Save to store
      useUnifiedStore.getState().addNote({
        id: crypto.randomUUID(),
        title: data.note.title,
        content: data.note.content,
        courseName: formData.courseName,
        topic: formData.topic,
        style: formData.style as any,
        type: formData.type as any,
        category: formData.context as any,
        aiGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Close modal after short delay
      setTimeout(() => {
        onClose()
        setGeneratedNote(null)
        setFormData({
          ...formData,
          topic: '',
          sourceText: '',
          existingNotes: '',
          additionalContext: ''
        })
      }, 1500)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
      setGeneratingNote(false)
      setNoteGenerationProgress(0)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">Generate AI-Powered Notes</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Course Selection */}
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              label="Course"
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.name}>
                  {course.name}
                </MenuItem>
              ))}
              <MenuItem value="Other">Other (Specify)</MenuItem>
            </Select>
          </FormControl>

          {/* Topic */}
          <TextField
            fullWidth
            label="Topic"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g., Cell Biology, World War II, Quantum Mechanics"
            required
          />

          <Divider />

          {/* Context Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Note Context
            </Typography>
            <ToggleButtonGroup
              value={formData.context}
              exclusive
              onChange={(e, value) => value && setFormData({ ...formData, context: value })}
              fullWidth
            >
              {NOTE_CONTEXTS.map((context) => (
                <ToggleButton key={context.value} value={context.value} size="small">
                  <Stack spacing={0.5} alignItems="center">
                    {context.icon}
                    <Typography variant="caption">{context.label}</Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Style Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Note Style
            </Typography>
            <Grid container spacing={1}>
              {NOTE_STYLES.map((style) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={style.value}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: formData.style === style.value ? 2 : 1,
                      borderColor: formData.style === style.value ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.light' }
                    }}
                    onClick={() => setFormData({ ...formData, style: style.value })}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {style.icon}
                      <Box>
                        <Typography variant="subtitle2">{style.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {style.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Format Type */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Output Format
            </Typography>
            <ToggleButtonGroup
              value={formData.type}
              exclusive
              onChange={(e, value) => value && setFormData({ ...formData, type: value })}
              fullWidth
            >
              {NOTE_TYPES.map((type) => (
                <ToggleButton key={type.value} value={type.value}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {type.icon}
                    <Typography variant="body2">{type.label}</Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Additional Input Fields based on context */}
          {formData.context === 'textbook' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Source Text (Paste textbook content)"
              value={formData.sourceText}
              onChange={(e) => setFormData({ ...formData, sourceText: e.target.value })}
              placeholder="Paste the textbook content you want to create notes from..."
            />
          )}

          {(formData.context === 'post-lecture' || formData.context === 'lecture') && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Existing Notes (Optional)"
              value={formData.existingNotes}
              onChange={(e) => setFormData({ ...formData, existingNotes: e.target.value })}
              placeholder="Paste your current notes to enhance them..."
            />
          )}

          {/* Additional Context */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Context (Optional)"
            value={formData.additionalContext}
            onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
            placeholder="Any specific requirements or focus areas..."
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {generatedNote && (
            <Alert severity="success">
              Note generated successfully!
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!formData.topic || !formData.courseName || generating}
          startIcon={generating ? <CircularProgress size={20} /> : <AutoAwesome />}
        >
          {generating ? 'Generating...' : 'Generate Note'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}