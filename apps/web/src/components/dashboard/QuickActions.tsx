'use client'

import React, { useState } from 'react'
import {
  Box,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Description as NotesIcon,
  CloudUpload as UploadIcon,
  School as CourseIcon,
  Quiz as QuizIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

const actions = [
  { icon: <NotesIcon />, name: 'Generate Notes', action: 'generate' },
  { icon: <UploadIcon />, name: 'Upload Document', action: 'upload' },
  { icon: <CourseIcon />, name: 'Add Course', action: 'add-course' },
  { icon: <QuizIcon />, name: 'Create Quiz', action: 'quiz' },
]

export default function QuickActions() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)

  const handleAction = (action: string) => {
    router.push(`/?action=${action}`)
    setOpen(false)
  }

  if (!isMobile) {
    return null
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: theme.zIndex.speedDial,
      }}
    >
      <SpeedDial
        ariaLabel="Quick actions"
        icon={<SpeedDialIcon icon={<AddIcon />} openIcon={<CloseIcon />} />}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        FabProps={{
          sx: {
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        }}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen
            onClick={() => handleAction(action.action)}
            FabProps={{
              sx: {
                bgcolor: 'background.paper',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                },
              },
            }}
          />
        ))}
      </SpeedDial>
    </Box>
  )
}