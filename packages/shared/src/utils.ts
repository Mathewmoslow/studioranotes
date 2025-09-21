// Shared utility functions
export const formatDate = (date: Date) => {
  return date.toLocaleDateString()
}

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}