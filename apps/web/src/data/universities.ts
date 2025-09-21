export interface UniversityConfig {
  id: string
  name: string
  shortName?: string
  canvasUrl: string
  system: 'semester' | 'quarter' | 'trimester'
  termLength: number // weeks
  termsPerYear: number
  gradeScale?: 'standard' | 'plus_minus' | 'pass_fail'
  timezone?: string
  colors?: {
    primary: string
    secondary: string
  }
  features?: {
    hasWinterSession?: boolean
    hasSummerSession?: boolean
    hasJTerm?: boolean
    hasCoOp?: boolean
  }
}

export const universities: Record<string, UniversityConfig> = {
  // California Universities
  'ucla': {
    id: 'ucla',
    name: 'University of California, Los Angeles',
    shortName: 'UCLA',
    canvasUrl: 'https://bruinlearn.ucla.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles',
    colors: { primary: '#2774AE', secondary: '#FFD100' }
  },
  'usc': {
    id: 'usc',
    name: 'University of Southern California',
    shortName: 'USC',
    canvasUrl: 'https://blackboard.usc.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles',
    colors: { primary: '#990000', secondary: '#FFC72C' }
  },
  'stanford': {
    id: 'stanford',
    name: 'Stanford University',
    shortName: 'Stanford',
    canvasUrl: 'https://canvas.stanford.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles',
    colors: { primary: '#8C1515', secondary: '#FFFFFF' }
  },
  'berkeley': {
    id: 'berkeley',
    name: 'University of California, Berkeley',
    shortName: 'UC Berkeley',
    canvasUrl: 'https://bcourses.berkeley.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles',
    colors: { primary: '#003262', secondary: '#FDB515' }
  },
  'ucsb': {
    id: 'ucsb',
    name: 'University of California, Santa Barbara',
    shortName: 'UCSB',
    canvasUrl: 'https://gauchospace.ucsb.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles'
  },
  'uci': {
    id: 'uci',
    name: 'University of California, Irvine',
    shortName: 'UC Irvine',
    canvasUrl: 'https://canvas.eee.uci.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles'
  },
  'ucsd': {
    id: 'ucsd',
    name: 'University of California, San Diego',
    shortName: 'UC San Diego',
    canvasUrl: 'https://canvas.ucsd.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles'
  },
  'ucdavis': {
    id: 'ucdavis',
    name: 'University of California, Davis',
    shortName: 'UC Davis',
    canvasUrl: 'https://canvas.ucdavis.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles'
  },
  'caltech': {
    id: 'caltech',
    name: 'California Institute of Technology',
    shortName: 'Caltech',
    canvasUrl: 'https://canvas.caltech.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'pass_fail',
    timezone: 'America/Los_Angeles'
  },

  // East Coast Universities
  'harvard': {
    id: 'harvard',
    name: 'Harvard University',
    shortName: 'Harvard',
    canvasUrl: 'https://canvas.harvard.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York',
    features: { hasJTerm: true }
  },
  'mit': {
    id: 'mit',
    name: 'Massachusetts Institute of Technology',
    shortName: 'MIT',
    canvasUrl: 'https://canvas.mit.edu',
    system: 'semester',
    termLength: 14,
    termsPerYear: 2,
    gradeScale: 'standard',
    timezone: 'America/New_York',
    features: { hasJTerm: true }
  },
  'yale': {
    id: 'yale',
    name: 'Yale University',
    shortName: 'Yale',
    canvasUrl: 'https://canvas.yale.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'princeton': {
    id: 'princeton',
    name: 'Princeton University',
    shortName: 'Princeton',
    canvasUrl: 'https://canvas.princeton.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'columbia': {
    id: 'columbia',
    name: 'Columbia University',
    shortName: 'Columbia',
    canvasUrl: 'https://courseworks2.columbia.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'nyu': {
    id: 'nyu',
    name: 'New York University',
    shortName: 'NYU',
    canvasUrl: 'https://newclasses.nyu.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York',
    features: { hasJTerm: true, hasSummerSession: true }
  },
  'cornell': {
    id: 'cornell',
    name: 'Cornell University',
    shortName: 'Cornell',
    canvasUrl: 'https://canvas.cornell.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'brown': {
    id: 'brown',
    name: 'Brown University',
    shortName: 'Brown',
    canvasUrl: 'https://canvas.brown.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'standard',
    timezone: 'America/New_York'
  },
  'penn': {
    id: 'penn',
    name: 'University of Pennsylvania',
    shortName: 'UPenn',
    canvasUrl: 'https://canvas.upenn.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'dartmouth': {
    id: 'dartmouth',
    name: 'Dartmouth College',
    shortName: 'Dartmouth',
    canvasUrl: 'https://canvas.dartmouth.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },

  // Midwest Universities
  'umich': {
    id: 'umich',
    name: 'University of Michigan',
    shortName: 'UMich',
    canvasUrl: 'https://canvas.umich.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Detroit'
  },
  'northwestern': {
    id: 'northwestern',
    name: 'Northwestern University',
    shortName: 'Northwestern',
    canvasUrl: 'https://canvas.northwestern.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'uchicago': {
    id: 'uchicago',
    name: 'University of Chicago',
    shortName: 'UChicago',
    canvasUrl: 'https://canvas.uchicago.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 4,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'uiuc': {
    id: 'uiuc',
    name: 'University of Illinois Urbana-Champaign',
    shortName: 'UIUC',
    canvasUrl: 'https://canvas.illinois.edu',
    system: 'semester',
    termLength: 16,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'purdue': {
    id: 'purdue',
    name: 'Purdue University',
    shortName: 'Purdue',
    canvasUrl: 'https://purdue.brightspace.com',
    system: 'semester',
    termLength: 16,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Indiana/Indianapolis'
  },
  'wisconsin': {
    id: 'wisconsin',
    name: 'University of Wisconsin-Madison',
    shortName: 'UW-Madison',
    canvasUrl: 'https://canvas.wisc.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'minnesota': {
    id: 'minnesota',
    name: 'University of Minnesota',
    shortName: 'UMN',
    canvasUrl: 'https://canvas.umn.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },

  // Healthcare/Medical Universities
  'adventhealth': {
    id: 'adventhealth',
    name: 'AdventHealth University',
    shortName: 'AHU',
    canvasUrl: 'https://ahu.instructure.com',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York',
    colors: { primary: '#0066CC', secondary: '#FDB913' },
    features: { hasSummerSession: true }
  },

  // Southern Universities
  'utexas': {
    id: 'utexas',
    name: 'University of Texas at Austin',
    shortName: 'UT Austin',
    canvasUrl: 'https://canvas.utexas.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'rice': {
    id: 'rice',
    name: 'Rice University',
    shortName: 'Rice',
    canvasUrl: 'https://canvas.rice.edu',
    system: 'semester',
    termLength: 14,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'vanderbilt': {
    id: 'vanderbilt',
    name: 'Vanderbilt University',
    shortName: 'Vanderbilt',
    canvasUrl: 'https://brightspace.vanderbilt.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Chicago'
  },
  'duke': {
    id: 'duke',
    name: 'Duke University',
    shortName: 'Duke',
    canvasUrl: 'https://sakai.duke.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'unc': {
    id: 'unc',
    name: 'University of North Carolina at Chapel Hill',
    shortName: 'UNC',
    canvasUrl: 'https://sakai.unc.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },
  'gatech': {
    id: 'gatech',
    name: 'Georgia Institute of Technology',
    shortName: 'Georgia Tech',
    canvasUrl: 'https://canvas.gatech.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York',
    features: { hasCoOp: true }
  },
  'ufl': {
    id: 'ufl',
    name: 'University of Florida',
    shortName: 'UF',
    canvasUrl: 'https://elearning.ufl.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York',
    features: { hasSummerSession: true }
  },
  'miami': {
    id: 'miami',
    name: 'University of Miami',
    shortName: 'UMiami',
    canvasUrl: 'https://blackboard.miami.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/New_York'
  },

  // Pacific Northwest
  'washington': {
    id: 'washington',
    name: 'University of Washington',
    shortName: 'UW',
    canvasUrl: 'https://canvas.uw.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'standard',
    timezone: 'America/Los_Angeles'
  },
  'oregon': {
    id: 'oregon',
    name: 'University of Oregon',
    shortName: 'UO',
    canvasUrl: 'https://canvas.uoregon.edu',
    system: 'quarter',
    termLength: 10,
    termsPerYear: 3,
    gradeScale: 'plus_minus',
    timezone: 'America/Los_Angeles'
  },

  // Mountain States
  'colorado': {
    id: 'colorado',
    name: 'University of Colorado Boulder',
    shortName: 'CU Boulder',
    canvasUrl: 'https://canvas.colorado.edu',
    system: 'semester',
    termLength: 16,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Denver'
  },
  'utah': {
    id: 'utah',
    name: 'University of Utah',
    shortName: 'Utah',
    canvasUrl: 'https://canvas.utah.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Denver'
  },
  'asu': {
    id: 'asu',
    name: 'Arizona State University',
    shortName: 'ASU',
    canvasUrl: 'https://canvas.asu.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Phoenix',
    features: { hasSummerSession: true }
  },
  'arizona': {
    id: 'arizona',
    name: 'University of Arizona',
    shortName: 'UArizona',
    canvasUrl: 'https://d2l.arizona.edu',
    system: 'semester',
    termLength: 15,
    termsPerYear: 2,
    gradeScale: 'plus_minus',
    timezone: 'America/Phoenix'
  },

  // Canadian Universities
  'ubc': {
    id: 'ubc',
    name: 'University of British Columbia',
    shortName: 'UBC',
    canvasUrl: 'https://canvas.ubc.ca',
    system: 'semester',
    termLength: 13,
    termsPerYear: 2,
    gradeScale: 'standard',
    timezone: 'America/Vancouver'
  },
  'toronto': {
    id: 'toronto',
    name: 'University of Toronto',
    shortName: 'UofT',
    canvasUrl: 'https://q.utoronto.ca',
    system: 'semester',
    termLength: 13,
    termsPerYear: 2,
    gradeScale: 'standard',
    timezone: 'America/Toronto'
  },
  'mcgill': {
    id: 'mcgill',
    name: 'McGill University',
    shortName: 'McGill',
    canvasUrl: 'https://mycourses2.mcgill.ca',
    system: 'semester',
    termLength: 13,
    termsPerYear: 2,
    gradeScale: 'standard',
    timezone: 'America/Montreal'
  },
  'waterloo': {
    id: 'waterloo',
    name: 'University of Waterloo',
    shortName: 'Waterloo',
    canvasUrl: 'https://learn.uwaterloo.ca',
    system: 'semester',
    termLength: 12,
    termsPerYear: 3,
    gradeScale: 'standard',
    timezone: 'America/Toronto',
    features: { hasCoOp: true }
  },

  // International
  'oxford': {
    id: 'oxford',
    name: 'University of Oxford',
    shortName: 'Oxford',
    canvasUrl: 'https://canvas.ox.ac.uk',
    system: 'trimester',
    termLength: 8,
    termsPerYear: 3,
    gradeScale: 'standard',
    timezone: 'Europe/London'
  },
  'cambridge': {
    id: 'cambridge',
    name: 'University of Cambridge',
    shortName: 'Cambridge',
    canvasUrl: 'https://vle.cam.ac.uk',
    system: 'trimester',
    termLength: 8,
    termsPerYear: 3,
    gradeScale: 'standard',
    timezone: 'Europe/London'
  }
}

// Helper functions
export function getUniversityConfig(universityId: string): UniversityConfig | null {
  return universities[universityId] || null
}

export function getCanvasUrl(universityId: string): string {
  return universities[universityId]?.canvasUrl || ''
}

export function getUniversityList() {
  return Object.values(universities).map(u => ({
    id: u.id,
    name: u.name,
    shortName: u.shortName,
    system: u.system
  })).sort((a, b) => a.name.localeCompare(b.name))
}

export function searchUniversities(query: string) {
  const lowQuery = query.toLowerCase()
  return Object.values(universities).filter(u =>
    u.name.toLowerCase().includes(lowQuery) ||
    u.shortName?.toLowerCase().includes(lowQuery) ||
    u.id.includes(lowQuery)
  )
}

// For the scheduler - calculate study periods based on university system
export function getStudyPeriods(universityId: string, currentDate: Date = new Date()) {
  const config = universities[universityId]
  if (!config) return null

  // This would need actual term dates from user or API
  // For now, return estimated periods based on system
  const periods = {
    beforeMidterms: config.termLength * 0.4,
    midterms: config.termLength * 0.5,
    beforeFinals: config.termLength * 0.8,
    finals: config.termLength
  }

  return periods
}

// Export types for use in other files
export type UniversitySystem = 'semester' | 'quarter' | 'trimester'
export type GradeScale = 'standard' | 'plus_minus' | 'pass_fail'