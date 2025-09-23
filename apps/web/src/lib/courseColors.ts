/**
 * Professional course color palette for better visual distinction
 * Using colors that are visually pleasing and accessible
 */
export const COURSE_COLOR_PALETTE = [
  '#2563eb', // Blue - Professional blue
  '#059669', // Emerald - Deep green
  '#dc2626', // Red - Strong red
  '#7c3aed', // Violet - Rich purple
  '#ea580c', // Orange - Vibrant orange
  '#0891b2', // Cyan - Ocean blue
  '#c026d3', // Fuchsia - Magenta
  '#0d9488', // Teal - Turquoise
  '#ca8a04', // Amber - Golden yellow
  '#e11d48', // Rose - Pink red
];

/**
 * Get a course color by index
 */
export function getCourseColor(index: number): string {
  return COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length];
}

/**
 * Generate a course color based on course ID or name
 */
export function generateCourseColor(courseIdOrName: string): string {
  let hash = 0;
  for (let i = 0; i < courseIdOrName.length; i++) {
    hash = courseIdOrName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLOR_PALETTE.length;
  return COURSE_COLOR_PALETTE[index];
}