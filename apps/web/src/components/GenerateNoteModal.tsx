'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material'
import {
  AutoAwesome,
  Description,
  School,
  CloudUpload,
} from '@mui/icons-material'
import { useScheduleStore } from '@/stores/useScheduleStore'
import DocumentUpload from './DocumentUpload'

interface GenerateNoteModalProps {
  open: boolean
  onClose: () => void
  preSelectedCourse?: any
}

export default function GenerateNoteModal({
  open,
  onClose,
  preSelectedCourse,
}: GenerateNoteModalProps) {
  const { courses } = useScheduleStore()
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [formData, setFormData] = useState({
    courseName: preSelectedCourse?.name || '',
    topic: '',
    sourceText: '',
    noteStyle: 'comprehensive',
    noteType: 'outline',
    noteContext: 'lecture',
    customPrompt: '',
  })

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          courseId: preSelectedCourse?.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Save the generated note to localStorage
        const existingNotes = JSON.parse(localStorage.getItem('generated-notes') || '{}')
        const noteId = `note-${Date.now()}`
        existingNotes[noteId] = {
          ...formData,
          content: data.content,
          timestamp: new Date().toISOString(),
          courseId: preSelectedCourse?.id,
        }
        localStorage.setItem('generated-notes', JSON.stringify(existingNotes))

        // Reload the page to show the new note
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to generate note:', error)
    } finally {
      setLoading(false)
    }
  }

  const noteStyles = [
    { value: 'comprehensive', label: 'Comprehensive', desc: 'Detailed coverage of all concepts' },
    { value: 'concise', label: 'Concise', desc: 'Key points and essential information' },
    { value: 'exploratory', label: 'Exploratory', desc: 'Deep dive with additional context' },
    { value: 'guided', label: 'Guided', desc: 'Step-by-step explanations' },
    { value: 'flexible', label: 'Flexible', desc: 'Adaptive to your needs' },
  ]

  const noteTypes = [
    { value: 'outline', label: 'Outline' },
    { value: 'summary', label: 'Summary' },
    { value: 'flashcards', label: 'Flashcards' },
    { value: 'concept_map', label: 'Concept Map' },
    { value: 'qa', label: 'Q&A Format' },
  ]

  const noteContexts = [
    { value: 'lecture', label: 'Lecture' },
    { value: 'textbook', label: 'Textbook Reading' },
    { value: 'pre-lecture', label: 'Pre-Lecture Prep' },
    { value: 'post-lecture', label: 'Post-Lecture Review' },
    { value: 'assignment', label: 'Assignment Help' },
    { value: 'study-guide', label: 'Study Guide' },
    { value: 'clinical', label: 'Clinical/Lab' },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">Generate AI Note</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {preSelectedCourse && (
            <Alert severity="info" icon={<School />}>
              Generating note for: <strong>{preSelectedCourse.name}</strong>
            </Alert>
          )}

          <TextField
            label="Topic"
            fullWidth
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g., Cardiovascular System, React Hooks, World War II"
            required
          />

          {!showUpload ? (
            <Box>
              <TextField
                label="Source Material (Optional)"
                fullWidth
                multiline
                rows={4}
                value={formData.sourceText}
                onChange={(e) => setFormData({ ...formData, sourceText: e.target.value })}
                placeholder="Paste lecture notes, textbook content, or any material you want to generate notes from..."
                helperText="Leave empty to generate notes from general knowledge"
              />
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => setShowUpload(true)}
                sx={{ mt: 1 }}
              >
                Or Upload Document (PDF, TXT, MD)
              </Button>
            </Box>
          ) : (
            <Box>
              <DocumentUpload
                onTextExtracted={(text) => {
                  setFormData({ ...formData, sourceText: text })
                  setShowUpload(false)
                }}
                acceptedTypes={['.pdf', '.txt', '.md']}
              />
              <Button
                variant="text"
                onClick={() => setShowUpload(false)}
                sx={{ mt: 1 }}
              >
                Back to Text Input
              </Button>
            </Box>
          )}

          <FormControl fullWidth>
            <InputLabel>Note Style</InputLabel>
            <Select
              value={formData.noteStyle}
              onChange={(e) => setFormData({ ...formData, noteStyle: e.target.value })}
              label="Note Style"
            >
              {noteStyles.map((style) => (
                <MenuItem key={style.value} value={style.value}>
                  <Box>
                    <Typography variant="body2">{style.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {style.desc}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Note Type</InputLabel>
            <Select
              value={formData.noteType}
              onChange={(e) => setFormData({ ...formData, noteType: e.target.value })}
              label="Note Type"
            >
              {noteTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Context</InputLabel>
            <Select
              value={formData.noteContext}
              onChange={(e) => setFormData({ ...formData, noteContext: e.target.value })}
              label="Context"
            >
              {noteContexts.map((context) => (
                <MenuItem key={context.value} value={context.value}>
                  {context.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Additional Instructions (Optional)"
            fullWidth
            multiline
            rows={2}
            value={formData.customPrompt}
            onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
            placeholder="e.g., Focus on clinical applications, Include practice problems, Explain like I'm 5"
          />
        </Stack>

        {loading && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Generating your personalized notes...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || !formData.topic}
          startIcon={<AutoAwesome />}
        >
          Generate Note
        </Button>
      </DialogActions>
    </Dialog>
  )
}