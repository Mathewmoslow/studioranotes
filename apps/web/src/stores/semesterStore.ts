import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Semester, SemesterManager, WeekInfo, WeekModule } from '@studioranotes/types';

interface SemesterState {
  currentSemester: Semester | null;
  weekModules: Record<number, WeekModule[]>; // week number -> modules
  
  // Actions
  setSemester: (semester: Semester) => void;
  updateSemester: (updates: Partial<Semester>) => void;
  getCurrentWeek: () => number;
  getWeekInfo: (weekNumber: number) => WeekInfo | null;
  getAllWeeks: () => WeekInfo[];
  getProgressPercentage: () => number;
  getRemainingDays: () => number;
  getWeekFromDate: (date: Date) => number;
  setWeekModules: (weekNumber: number, modules: WeekModule[]) => void;
  getWeekModules: (weekNumber: number) => WeekModule[];
  clearSemester: () => void;
}

// Default semester configuration (Summer 2025)
const DEFAULT_SEMESTER: Semester = {
  id: 'summer-2025',
  name: 'Summer 2025',
  startDate: new Date('2025-05-05'),
  endDate: new Date('2025-08-08'),
  totalWeeks: 14,
  courses: []
};

export const useSemesterStore = create<SemesterState>()(
  persist(
    (set, get) => ({
      currentSemester: null,
      weekModules: {},

      setSemester: (semester) => set({ 
        currentSemester: semester,
        weekModules: {} 
      }),

      updateSemester: (updates) => set((state) => ({
        currentSemester: state.currentSemester 
          ? { ...state.currentSemester, ...updates }
          : null
      })),

      getCurrentWeek: () => {
        const { currentSemester } = get();
        if (!currentSemester) return 1;
        
        const manager = new SemesterManager(currentSemester);
        return manager.getCurrentWeek();
      },

      getWeekInfo: (weekNumber) => {
        const { currentSemester } = get();
        if (!currentSemester) return null;
        
        const manager = new SemesterManager(currentSemester);
        return manager.getWeekInfo(weekNumber);
      },

      getAllWeeks: () => {
        const { currentSemester } = get();
        if (!currentSemester) return [];
        
        const manager = new SemesterManager(currentSemester);
        return manager.getAllWeeks();
      },

      getProgressPercentage: () => {
        const { currentSemester } = get();
        if (!currentSemester) return 0;
        
        const manager = new SemesterManager(currentSemester);
        return manager.getProgressPercentage();
      },

      getRemainingDays: () => {
        const { currentSemester } = get();
        if (!currentSemester) return 0;
        
        const manager = new SemesterManager(currentSemester);
        return manager.getRemainingDays();
      },

      getWeekFromDate: (date) => {
        const { currentSemester } = get();
        if (!currentSemester) return 1;
        
        const manager = new SemesterManager(currentSemester);
        return manager.getWeekFromDate(date);
      },

      setWeekModules: (weekNumber, modules) => set((state) => ({
        weekModules: {
          ...state.weekModules,
          [weekNumber]: modules
        }
      })),

      getWeekModules: (weekNumber) => {
        const { weekModules } = get();
        return weekModules[weekNumber] || [];
      },

      clearSemester: () => set({
        currentSemester: null,
        weekModules: {}
      })
    }),
    {
      name: 'semester-storage',
      partialize: (state) => ({
        currentSemester: state.currentSemester,
        weekModules: state.weekModules
      })
    }
  )
);

// Helper hook to get semester manager
export function useSemesterManager(): SemesterManager | null {
  const currentSemester = useSemesterStore(state => state.currentSemester);
  
  if (!currentSemester) {
    return null;
  }
  
  return new SemesterManager(currentSemester);
}

// Helper function to initialize semester if not set
export function initializeSemester() {
  const { currentSemester, setSemester } = useSemesterStore.getState();
  
  if (!currentSemester) {
    setSemester(DEFAULT_SEMESTER);
  }
}