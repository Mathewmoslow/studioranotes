'use client'

import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Button,
  Menu,
  MenuItem,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Description,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Star,
  StarBorder,
  ArrowForward,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface Note {
  slug: string
  title: string
  course: string
  module: string
  date: string
  excerpt: string
  starred?: boolean
}

export default function RecentNotesWidget() {
  const theme = useTheme()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  useEffect(() => {
    const storedNotes = localStorage.getItem('generated-notes')
    if (storedNotes) {
      const notesData = JSON.parse(storedNotes)
      const recentNotes = Object.entries(notesData)
        .slice(0, 5)
        .map(([slug, data]: [string, any]) => ({
          slug,
          title: data.title,
          course: data.course,
          module: data.module || 'General',
          date: data.date || new Date().toISOString(),
          excerpt: data.markdown?.substring(0, 100) + '...' || '',
          starred: false,
        }))
      setNotes(recentNotes)
    }
    setLoading(false)
  }, [])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, slug: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedNote(slug)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedNote(null)
  }

  const handleToggleStar = (slug: string) => {
    setNotes(prev =>
      prev.map(note =>
        note.slug === slug ? { ...note, starred: !note.starred } : note
      )
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Recent Notes
        </Typography>
        <List>
          {[1, 2, 3].map((i) => (
            <ListItem key={i} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Skeleton variant="circular" width={40} height={40} />
              </ListItemAvatar>
              <ListItemText
                primary={<Skeleton width="60%" />}
                secondary={<Skeleton width="40%" />}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Recent Notes
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => router.push('/notes')}
          sx={{ textTransform: 'none' }}
        >
          View All
        </Button>
      </Box>

      {notes.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Description sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
          <Typography variant="body1">No notes yet</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Start by generating your first note
          </Typography>
          <Button
            variant="contained"
            startIcon={<Description />}
            onClick={() => router.push('/?action=generate')}
            sx={{ textTransform: 'none' }}
          >
            Generate Note
          </Button>
        </Box>
      ) : (
        <List sx={{ mx: -3, px: 3 }}>
          {notes.map((note, index) => (
            <ListItem
              key={note.slug}
              sx={{
                px: 0,
                py: 2,
                borderBottom: index < notes.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
              }}
              onClick={() => router.push(`/notes/${note.slug}`)}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                  }}
                >
                  <Description />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {note.title}
                    </Typography>
                    {note.starred && (
                      <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {note.excerpt}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={note.course}
                        size="small"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        • {formatDate(note.date)}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleStar(note.slug)
                  }}
                >
                  {note.starred ? (
                    <Star sx={{ fontSize: 20, color: 'warning.main' }} />
                  ) : (
                    <StarBorder sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMenuOpen(e, note.slug)
                  }}
                >
                  <MoreVert sx={{ fontSize: 20 }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            router.push(`/notes/${selectedNote}`)
            handleMenuClose()
          }}
        >
          <Visibility sx={{ mr: 1, fontSize: 20 }} /> View
        </MenuItem>
        <MenuItem
          onClick={() => {
            router.push(`/notes/${selectedNote}?edit=true`)
            handleMenuClose()
          }}
        >
          <Edit sx={{ mr: 1, fontSize: 20 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose()
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1, fontSize: 20 }} /> Delete
        </MenuItem>
      </Menu>
    </Paper>
  )
}