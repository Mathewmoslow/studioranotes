'use client'

import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  Button,
  Alert,
} from '@mui/material'
import {
  Sync,
  Schedule,
  CheckCircle,
  Error,
  CloudSync,
} from '@mui/icons-material'
import { useCanvasAutoSync } from '@/lib/canvas-auto-sync'
import { formatDistanceToNow } from 'date-fns'

export default function CanvasAutoSyncSettings() {
  const { status, enable, disable, setInterval, syncNow } = useCanvasAutoSync()

  const handleToggle = () => {
    if (status.enabled) {
      disable()
    } else {
      enable()
    }
  }

  const handleIntervalChange = (event: any) => {
    const minutes = parseInt(event.target.value)
    setInterval(minutes)
  }

  const handleSyncNow = async () => {
    await syncNow()
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CloudSync color="primary" />
              <Typography variant="h6">Canvas Auto-Sync</Typography>
            </Box>
            <Switch
              checked={status.enabled}
              onChange={handleToggle}
              color="primary"
            />
          </Box>

          {status.enabled && (
            <>
              <FormControl fullWidth>
                <InputLabel>Sync Interval</InputLabel>
                <Select
                  value={status.interval / 60000}
                  onChange={handleIntervalChange}
                  label="Sync Interval"
                >
                  <MenuItem value={15}>Every 15 minutes</MenuItem>
                  <MenuItem value={30}>Every 30 minutes</MenuItem>
                  <MenuItem value={60}>Every hour</MenuItem>
                  <MenuItem value={120}>Every 2 hours</MenuItem>
                  <MenuItem value={360}>Every 6 hours</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status:
                </Typography>
                {status.syncInProgress ? (
                  <Chip
                    icon={<Sync />}
                    label="Syncing..."
                    color="primary"
                    size="small"
                  />
                ) : status.lastSync ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`Last sync ${formatDistanceToNow(status.lastSync)} ago`}
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<Schedule />}
                    label="Never synced"
                    color="default"
                    size="small"
                  />
                )}
              </Box>

              {status.failedAttempts > 0 && (
                <Alert severity="warning" icon={<Error />}>
                  Sync has failed {status.failedAttempts} time(s).
                  {status.failedAttempts >= 3 && ' Auto-sync has been disabled due to repeated failures.'}
                </Alert>
              )}

              <Button
                variant="outlined"
                startIcon={<Sync />}
                onClick={handleSyncNow}
                disabled={status.syncInProgress}
                fullWidth
              >
                {status.syncInProgress ? 'Syncing...' : 'Sync Now'}
              </Button>

              <Alert severity="info">
                Auto-sync will automatically fetch new assignments, events, and announcements from your Canvas courses.
                It runs in the background and updates your schedule without any manual intervention.
              </Alert>
            </>
          )}

          {!status.enabled && (
            <Alert severity="info">
              Enable auto-sync to keep your Canvas courses up to date automatically.
              New assignments and events will be imported in the background.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}