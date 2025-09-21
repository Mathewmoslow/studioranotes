'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  CloudUpload,
  Description,
  PictureAsPdf,
  Article,
  Close,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material'

interface DocumentUploadProps {
  onUploadComplete?: (data: any) => void
  onTextExtracted?: (text: string) => void
  acceptedTypes?: string[]
  maxSize?: number
}

export default function DocumentUpload({
  onUploadComplete,
  onTextExtracted,
  acceptedTypes = ['.pdf', '.txt', '.md', '.csv'],
  maxSize = 10 * 1024 * 1024, // 10MB
}: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [extractedText, setExtractedText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [uploadResults, setUploadResults] = useState<any[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setFiles(acceptedFiles)

    // Auto-upload if only one file
    if (acceptedFiles.length === 1) {
      handleUpload(acceptedFiles)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
    },
    maxSize,
    multiple: false,
  })

  const handleUpload = async (filesToUpload?: File[]) => {
    const uploadFiles = filesToUpload || files
    if (uploadFiles.length === 0) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)
    setUploadResults([])

    try {
      const results = []

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', detectDocumentType(file.name))

        setUploadProgress((i / uploadFiles.length) * 100)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const data = await response.json()
        results.push(data)

        // Extract text for note generation
        if (data.text) {
          setExtractedText(data.text)
          onTextExtracted?.(data.text)
        }
      }

      setUploadResults(results)
      setUploadProgress(100)
      onUploadComplete?.(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase()
    if (lower.includes('syllabus')) return 'syllabus'
    if (lower.includes('lecture') || lower.includes('notes')) return 'lecture'
    if (lower.includes('chapter') || lower.includes('textbook')) return 'textbook'
    return 'document'
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return <PictureAsPdf />
    if (file.type.startsWith('text/')) return <Article />
    return <Description />
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setUploadResults(uploadResults.filter((_, i) => i !== index))
  }

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ textAlign: 'center' }}>
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop the files here...' : 'Drag & drop documents here'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or click to select files
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Chip label="PDF" size="small" />
            <Chip label="TXT" size="small" />
            <Chip label="Markdown" size="small" />
            <Chip label="CSV" size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Max file size: 10MB
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files
          </Typography>
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFile(index)}>
                    <Close />
                  </IconButton>
                }
              >
                <ListItemIcon>{getFileIcon(file)}</ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024).toFixed(2)} KB`}
                />
              </ListItem>
            ))}
          </List>

          {!uploading && files.length > 0 && uploadResults.length === 0 && (
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => handleUpload()}
              fullWidth
              sx={{ mt: 2 }}
            >
              Upload and Process
            </Button>
          )}
        </Box>
      )}

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Processing documents...
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {uploadResults.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="success" icon={<CheckCircle />}>
            Successfully processed {uploadResults.length} document(s)
          </Alert>

          {uploadResults.map((result, index) => (
            <Paper key={index} sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {result.metadata?.fileName}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={`${result.wordCount} words`}
                  size="small"
                  variant="outlined"
                />
                {result.metadata?.pageCount && (
                  <Chip
                    label={`${result.metadata.pageCount} pages`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              {result.structuredData?.courseInfo?.code && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Course: <strong>{result.structuredData.courseInfo.code}</strong>
                </Typography>
              )}

              {result.structuredData?.topics?.length > 0 && (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Topics found:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {result.structuredData.topics.slice(0, 5).map((topic: string, i: number) => (
                      <Chip key={i} label={topic} size="small" />
                    ))}
                  </Stack>
                </>
              )}

              {result.structuredData?.assignments?.length > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Found {result.structuredData.assignments.length} assignment(s) that can be imported
                </Alert>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {extractedText && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Extracted Text Preview
          </Typography>
          <Paper
            sx={{
              p: 2,
              maxHeight: 200,
              overflow: 'auto',
              bgcolor: 'grey.50',
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {extractedText.substring(0, 500)}...
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {extractedText.length} characters extracted
          </Typography>
        </Box>
      )}
    </Box>
  )
}