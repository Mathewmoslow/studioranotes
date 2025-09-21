'use client'

import React from 'react'
import { Box, Container } from '@mui/material'
import CalendarView from '@/components/schedule/CalendarView'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default function SchedulePage() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <DashboardSidebar />
      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        <CalendarView />
      </Container>
    </Box>
  )
}