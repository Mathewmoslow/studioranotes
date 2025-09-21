'use client'

import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Stack,
  Button,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Assignment,
  School,
  Schedule,
  Grade,
  CloudSync,
  CheckCircle,
  Warning,
} from '@mui/icons-material'
import { usePushNotifications } from '@/lib/push-notifications'

export default function NotificationSettings() {
  const {
    supported,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const [preferences, setPreferences] = useState({
    assignments: true,
    classes: true,
    studySessions: true,
    grades: true,
    canvasUpdates: true,
    dailySummary: false,
  })

  const handleToggleMain = async () => {
    if (subscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const handlePreferenceChange = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPreferences = { ...preferences, [key]: event.target.checked }
    setPreferences(newPreferences)

    // Save preferences to server
    fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPreferences),
    })
  }

  if (!supported) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning" icon={<Warning />}>
            Push notifications are not supported in this browser.
            Please use a modern browser like Chrome, Firefox, or Edge.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {subscribed ? (
                <NotificationsActive color="primary" />
              ) : (
                <NotificationsOff color="disabled" />
              )}
              <Typography variant="h6">Push Notifications</Typography>
            </Box>
            <Switch
              checked={subscribed}
              onChange={handleToggleMain}
              disabled={loading || permission === 'denied'}
              color="primary"
            />
          </Box>

          {/* Permission Status */}
          {permission === 'denied' && (
            <Alert severity="error" icon={<NotificationsOff />}>
              Notifications are blocked. Please enable them in your browser settings to receive updates.
            </Alert>
          )}

          {permission === 'default' && !subscribed && (
            <Alert severity="info">
              Enable push notifications to receive timely reminders about assignments, classes, and study sessions.
            </Alert>
          )}

          {subscribed && (
            <>
              <Alert severity="success" icon={<CheckCircle />}>
                Push notifications are enabled. You'll receive updates on your device.
              </Alert>

              <Divider />

              {/* Notification Preferences */}
              <Box>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Notification Preferences
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose what types of notifications you want to receive
                </Typography>

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Assignment color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Assignment Reminders"
                      secondary="Get notified about upcoming assignment deadlines"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.assignments}
                        onChange={handlePreferenceChange('assignments')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <School color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Class Reminders"
                      secondary="Notifications 15 minutes before classes start"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.classes}
                        onChange={handlePreferenceChange('classes')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Schedule color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Study Session Reminders"
                      secondary="Reminders for scheduled study blocks"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.studySessions}
                        onChange={handlePreferenceChange('studySessions')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Grade color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Grade Updates"
                      secondary="Get notified when new grades are posted"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.grades}
                        onChange={handlePreferenceChange('grades')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <CloudSync color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Canvas Updates"
                      secondary="New announcements and course updates from Canvas"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.canvasUpdates}
                        onChange={handlePreferenceChange('canvasUpdates')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>

                  <Divider sx={{ my: 1 }} />

                  <ListItem>
                    <ListItemIcon>
                      <Notifications color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Daily Summary"
                      secondary="Receive a daily summary of upcoming tasks at 8 AM"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.dailySummary}
                        onChange={handlePreferenceChange('dailySummary')}
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Box>

              {/* Test Notification */}
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<Notifications />}
                  onClick={() => {
                    if ('Notification' in window) {
                      new Notification('Test Notification', {
                        body: 'Push notifications are working correctly!',
                        icon: '/icon-192x192.png',
                      })
                    }
                  }}
                  fullWidth
                >
                  Send Test Notification
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}