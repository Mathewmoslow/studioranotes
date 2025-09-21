'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Avatar,
  Collapse,
  alpha,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Description as NotesIcon,
  TrendingUp as ProgressIcon,
  Quiz as QuizIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  AutoAwesome,
  Folder,
  CalendarMonth,
  Analytics,
  CloudUpload,
  Group,
} from '@mui/icons-material'

interface SidebarItem {
  title: string
  icon: React.ReactNode
  path?: string
  action?: () => void
  badge?: string | number
  children?: SidebarItem[]
}

interface DashboardSidebarProps {
  collapsed?: boolean
}

export default function DashboardSidebar({ collapsed = false }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['courses'])

  const handleToggleExpand = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const sidebarItems: SidebarItem[] = [
    {
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      title: 'Quick Actions',
      icon: <AutoAwesome />,
      children: [
        { title: 'Generate Notes', icon: <AddIcon />, path: '/?action=generate' },
        { title: 'Upload Document', icon: <CloudUpload />, path: '/?action=upload' },
      ]
    },
    {
      title: 'Courses',
      icon: <SchoolIcon />,
      badge: '5',
      children: [
        { title: 'All Courses', icon: <Folder />, path: '/courses' },
        { title: 'Current Semester', icon: <CalendarMonth />, path: '/semester' },
      ]
    },
    {
      title: 'Notes',
      icon: <NotesIcon />,
      badge: '23',
      path: '/notes',
    },
    {
      title: 'Study Tools',
      icon: <QuizIcon />,
      children: [
        { title: 'Concept Maps', icon: <Analytics />, path: '/tools/concepts' },
        { title: 'Study Groups', icon: <Group />, path: '/tools/groups' },
      ]
    },
    {
      title: 'Progress',
      icon: <ProgressIcon />,
      path: '/progress',
    },
    {
      title: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ]

  const renderSidebarItem = (item: SidebarItem, depth = 0) => {
    const isActive = pathname === item.path
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleToggleExpand(item.title)
              } else if (item.path) {
                router.push(item.path)
              } else if (item.action) {
                item.action()
              }
            }}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: depth > 0 ? 4 : 2.5,
              py: 1,
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              backgroundColor: isActive ? alpha('#1976d2', 0.08) : 'transparent',
              color: isActive ? 'primary.main' : 'text.primary',
              '&:hover': {
                backgroundColor: alpha('#1976d2', 0.04),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 0 : 3,
                justifyContent: 'center',
                color: isActive ? 'primary.main' : 'text.secondary',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: depth > 0 ? 13 : 14,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: alpha('#1976d2', 0.1),
                      color: 'primary.main',
                    }}
                  />
                )}
                {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {!collapsed && hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderSidebarItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, pt: 3 }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, px: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                mr: 2
              }}
            >
              <SchoolIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                NotesAI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Smart Study Platform
              </Typography>
            </Box>
          </Box>
        )}
        {collapsed && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
              <SchoolIcon />
            </Avatar>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <List sx={{ flexGrow: 1, pt: 1 }}>
        {sidebarItems.slice(0, -1).map(item => renderSidebarItem(item))}
      </List>

      <Divider sx={{ mx: 2, mt: 'auto', mb: 1 }} />

      <List>
        {sidebarItems.slice(-1).map(item => renderSidebarItem(item))}
      </List>

      {!collapsed && (
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Study Streak
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              7 Days
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Keep it up!
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}