'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Search,
  Add,
  FilterList,
  Description,
  Star,
  StarBorder,
  Archive,
  Unarchive,
  Delete,
  AutoAwesome,
  School,
  CalendarMonth,
  LocalOffer
} from '@mui/icons-material'
import { useUnifiedStore } from '@/stores/useUnifiedStore'
import NoteGenerationModal from '@/components/notes/NoteGenerationModal'

// Inline EmptyState component
const EmptyState = ({ icon, title, description, action }: {
  icon: React.ReactNode,
  title: string,
  description: string,
  action?: { label: string, onClick: () => void }
}) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <Box sx={{ mb: 2, color: 'text.secondary', fontSize: '3rem' }}>
      {icon}
    </Box>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      {description}
    </Typography>
    {action && (
      <Button variant="contained" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Box>
)
import { format } from 'date-fns'

export default function NotesPage() {
  const { data: session } = useSession()
  const {
    notes,
    courses,
    setGeneratingNote,
    setNoteGenerationProgress,
    addNote,
    updateNote,
    deleteNote
  } = useUnifiedStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)

  // Filter notes based on search and filters
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = !selectedCourse || note.courseId === selectedCourse
    const matchesFilter = selectedFilter === 'all' ||
                          (selectedFilter === 'starred' && note.starred) ||
                          (selectedFilter === 'archived' && note.archived) ||
                          (selectedFilter === 'ai' && note.aiGenerated)

    return matchesSearch && matchesCourse && matchesFilter
  })

  const handleToggleStar = (noteId: string, currentStarred: boolean) => {
    updateNote(noteId, { starred: !currentStarred })
  }

  const handleToggleArchive = (noteId: string, currentArchived: boolean) => {
    updateNote(noteId, { archived: !currentArchived })
  }

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNote(noteId)
    }
  }

  const handleGenerateNote = () => {
    setNoteModalOpen(true)
  }

  if (!session) {
    return (
      <Container>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">Please sign in to view your notes</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          My Notes
        </Typography>

        {/* Search and Filters */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />

          <Button
            startIcon={<FilterList />}
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
          >
            Filter: {selectedFilter}
          </Button>

          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={() => setFilterAnchorEl(null)}
          >
            <MenuItem onClick={() => { setSelectedFilter('all'); setFilterAnchorEl(null) }}>
              <ListItemText>All Notes</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSelectedFilter('starred'); setFilterAnchorEl(null) }}>
              <ListItemIcon><Star /></ListItemIcon>
              <ListItemText>Starred</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSelectedFilter('archived'); setFilterAnchorEl(null) }}>
              <ListItemIcon><Archive /></ListItemIcon>
              <ListItemText>Archived</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSelectedFilter('ai'); setFilterAnchorEl(null) }}>
              <ListItemIcon><AutoAwesome /></ListItemIcon>
              <ListItemText>AI Generated</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        {/* Stats */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Chip
            icon={<Description />}
            label={`${notes.length} Total Notes`}
            color="primary"
          />
          <Chip
            icon={<Star />}
            label={`${notes.filter(n => n.starred).length} Starred`}
            color="secondary"
          />
          <Chip
            icon={<AutoAwesome />}
            label={`${notes.filter(n => n.aiGenerated).length} AI Generated`}
          />
        </Stack>
      </Box>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Description />}
              title={searchTerm || selectedFilter !== 'all' ? "No notes found" : "No notes yet"}
              description={
                searchTerm || selectedFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "Create your first note or generate one with AI"
              }
              action={{
                label: "Generate AI Note",
                onClick: () => setNoteModalOpen(true)
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredNotes.map((note) => {
            const course = courses.find(c => c.id === note.courseId)

            return (
              <Grid key={note.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s'
                    }
                  }}
                >
                  {note.aiGenerated && (
                    <Chip
                      icon={<AutoAwesome />}
                      label="AI Generated"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1
                      }}
                    />
                  )}

                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {note.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStar(note.id, note.starred)}
                      >
                        {note.starred ? <Star color="warning" /> : <StarBorder />}
                      </IconButton>
                    </Box>

                    {note.summary && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {note.summary}
                      </Typography>
                    )}

                    {/* Metadata */}
                    <Stack spacing={1}>
                      {course && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <School fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {course.code}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarMonth fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(note.createdAt), 'MMM d, yyyy')}
                        </Typography>
                      </Box>

                      {note.tags.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <LocalOffer fontSize="small" color="action" />
                          {note.tags.slice(0, 2).map(tag => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ height: 20 }}
                            />
                          ))}
                          {note.tags.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{note.tags.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button size="small" fullWidth>
                        View
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleArchive(note.id, note.archived)}
                      >
                        {note.archived ? <Unarchive /> : <Archive />}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Generate Note FAB */}
      <Fab
        color="primary"
        variant="extended"
        aria-label="generate note"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={handleGenerateNote}
      >
        <AutoAwesome sx={{ mr: 1 }} />
        Generate AI Note
      </Fab>

      {/* Note Generation Modal */}
      <NoteGenerationModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
      />
    </Container>
  )
}