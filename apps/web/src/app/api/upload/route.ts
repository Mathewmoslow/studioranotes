import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import pdf from 'pdf-parse' // Temporarily disabled - causing build errors

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout for large files

// POST /api/upload - Upload and parse documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    let extractedText = ''
    let metadata: any = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    }

    // Handle different file types
    if (file.type === 'application/pdf') {
      // Parse PDF - temporarily return error until pdf-parse is fixed
      return NextResponse.json(
        { error: 'PDF parsing temporarily disabled' },
        { status: 501 }
      )
      // const buffer = Buffer.from(await file.arrayBuffer())
      // const pdfData = await pdf(buffer)
      // extractedText = pdfData.text
      // metadata.pageCount = pdfData.numpages
      // metadata.info = pdfData.info
    } else if (
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.type === 'text/csv'
    ) {
      // Handle text files
      extractedText = await file.text()
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      // For Word documents, we'd need a different parser
      // For now, return an error
      return NextResponse.json(
        { error: 'Word documents not yet supported. Please convert to PDF or text.' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }

    // Clean and process the text
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim()

    // Extract key information based on document type
    let structuredData: any = {
      rawText: extractedText,
      metadata
    }

    if (type === 'syllabus') {
      // Try to extract syllabus-specific information
      structuredData.courseInfo = extractCourseInfo(extractedText)
      structuredData.schedule = extractSchedule(extractedText)
      structuredData.assignments = extractAssignments(extractedText)
    } else if (type === 'lecture') {
      // Extract lecture notes structure
      structuredData.topics = extractTopics(extractedText)
      structuredData.keyPoints = extractKeyPoints(extractedText)
    } else if (type === 'textbook') {
      // Extract textbook chapter information
      structuredData.chapters = extractChapters(extractedText)
      structuredData.concepts = extractConcepts(extractedText)
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      structuredData,
      metadata,
      wordCount: extractedText.split(' ').length,
      characterCount: extractedText.length
    })
  } catch (error) {
    console.error('Error processing upload:', error)
    return NextResponse.json(
      { error: 'Failed to process file', details: error },
      { status: 500 }
    )
  }
}

// Helper functions for text extraction
function extractCourseInfo(text: string): any {
  const courseInfo: any = {}

  // Try to find course code (e.g., "NURS 320", "CS 101")
  const courseCodeMatch = text.match(/\b([A-Z]{2,4})\s*(\d{3,4}[A-Z]?)\b/)
  if (courseCodeMatch) {
    courseInfo.code = `${courseCodeMatch[1]} ${courseCodeMatch[2]}`
  }

  // Try to find instructor name (after "Instructor:", "Professor:", etc.)
  const instructorMatch = text.match(/(?:instructor|professor|prof\.|dr\.)\s*:?\s*([A-Za-z\s.]+?)(?:\n|Email|Office|Phone)/i)
  if (instructorMatch) {
    courseInfo.instructor = instructorMatch[1].trim()
  }

  // Try to find office hours
  const officeHoursMatch = text.match(/office\s*hours?\s*:?\s*([^\n]+)/i)
  if (officeHoursMatch) {
    courseInfo.officeHours = officeHoursMatch[1].trim()
  }

  return courseInfo
}

function extractSchedule(text: string): any[] {
  const schedule: any[] = []

  // Look for date patterns (various formats)
  const datePatterns = [
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/gi,
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g,
    /Week\s+(\d{1,2})\s*[-:]\s*([^(\n]+)/gi
  ]

  datePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      schedule.push({
        date: match[1],
        topic: match[2] || 'TBD',
        raw: match[0]
      })
    }
  })

  return schedule
}

function extractAssignments(text: string): any[] {
  const assignments: any[] = []

  // Look for assignment patterns
  const patterns = [
    /(?:assignment|homework|hw|project|paper|exam|quiz|test|midterm|final)\s*#?\d*\s*:?\s*([^(\n]+?)(?:due|deadline|submit)?\s*:?\s*([^(\n]+)/gi,
    /due\s*:?\s*([^(\n]+)/gi
  ]

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      assignments.push({
        title: match[1]?.trim() || 'Assignment',
        dueDate: match[2]?.trim() || match[1]?.trim(),
        raw: match[0]
      })
    }
  })

  return assignments
}

function extractTopics(text: string): string[] {
  const topics: string[] = []

  // Look for headers or bullet points
  const lines = text.split('\n')
  lines.forEach(line => {
    // Check if line looks like a header (starts with number, bullet, or capital letters)
    if (
      /^\d+\./.test(line) || // Numbered list
      /^[•·▪▫◦‣⁃]/.test(line) || // Bullet points
      /^[A-Z][A-Z\s]{2,}/.test(line) || // All caps header
      /^#{1,6}\s/.test(line) // Markdown headers
    ) {
      const topic = line
        .replace(/^[\d.•·▪▫◦‣⁃#\s]+/, '')
        .trim()

      if (topic.length > 3 && topic.length < 100) {
        topics.push(topic)
      }
    }
  })

  return topics.slice(0, 20) // Limit to 20 topics
}

function extractKeyPoints(text: string): string[] {
  const keyPoints: string[] = []

  // Look for sentences with key indicator words
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  const keyIndicators = [
    'important', 'remember', 'note that', 'key point', 'essential',
    'critical', 'fundamental', 'must', 'should', 'main idea',
    'in summary', 'therefore', 'thus', 'consequently'
  ]

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase()
    if (keyIndicators.some(indicator => lower.includes(indicator))) {
      keyPoints.push(sentence.trim())
    }
  })

  return keyPoints.slice(0, 10) // Limit to 10 key points
}

function extractChapters(text: string): any[] {
  const chapters: any[] = []

  // Look for chapter patterns
  const chapterPatterns = [
    /Chapter\s+(\d+)\s*[:\-.]?\s*([^\n]+)/gi,
    /Unit\s+(\d+)\s*[:\-.]?\s*([^\n]+)/gi,
    /Module\s+(\d+)\s*[:\-.]?\s*([^\n]+)/gi
  ]

  chapterPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      chapters.push({
        number: parseInt(match[1]),
        title: match[2].trim(),
        raw: match[0]
      })
    }
  })

  return chapters
}

function extractConcepts(text: string): string[] {
  const concepts: string[] = []

  // Look for terms that are defined or emphasized
  const patterns = [
    /"([^"]+)"/g, // Terms in quotes
    /\*([^*]+)\*/g, // Terms in asterisks
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:is|are|means|refers to|defined as)/g, // Defined terms
    /(?:term|concept|definition):\s*([^\n]+)/gi
  ]

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const concept = match[1].trim()
      if (concept.length > 2 && concept.length < 50 && !concepts.includes(concept)) {
        concepts.push(concept)
      }
    }
  })

  return concepts.slice(0, 30) // Limit to 30 concepts
}