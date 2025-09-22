import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AcademicTerm,
  AcademicSystem,
  getCurrentTerm,
  getNextTerm,
  ADVENT_HEALTH_TRIMESTERS,
  TRADITIONAL_SEMESTERS,
  formatTermName
} from '@/lib/academic-terms';

interface AcademicTermState {
  currentTerm: AcademicTerm | null;
  selectedSystem: AcademicSystem;
  universityId: string | null;

  // Actions
  setCurrentTerm: (term: AcademicTerm) => void;
  setSystem: (system: AcademicSystem) => void;
  setUniversity: (universityId: string) => void;
  getCurrentTermForSystem: (system?: AcademicSystem) => AcademicTerm | null;
  getNextTermForSystem: (system?: AcademicSystem) => AcademicTerm | null;
  getAvailableTerms: () => AcademicTerm[];
  getTermProgress: () => number;
  getRemainingWeeks: () => number;
  getCurrentWeek: () => number;
}

export const useAcademicTermStore = create<AcademicTermState>()(
  persist(
    (set, get) => ({
      currentTerm: null,
      selectedSystem: 'trimester', // Default to trimester for Advent Health
      universityId: 'adventhealth',

      setCurrentTerm: (term) => set({ currentTerm: term }),

      setSystem: (system) => {
        const currentTerm = getCurrentTerm(system);
        set({
          selectedSystem: system,
          currentTerm
        });
      },

      setUniversity: (universityId) => {
        // Look up university config and set appropriate system
        let system: AcademicSystem = 'semester';
        if (universityId === 'adventhealth') {
          system = 'trimester';
        }
        const currentTerm = getCurrentTerm(system);
        set({
          universityId,
          selectedSystem: system,
          currentTerm
        });
      },

      getCurrentTermForSystem: (system) => {
        const { selectedSystem } = get();
        return getCurrentTerm(system || selectedSystem);
      },

      getNextTermForSystem: (system) => {
        const { selectedSystem } = get();
        return getNextTerm(system || selectedSystem);
      },

      getAvailableTerms: () => {
        const { selectedSystem } = get();
        const config = selectedSystem === 'trimester'
          ? ADVENT_HEALTH_TRIMESTERS
          : TRADITIONAL_SEMESTERS;

        const currentYear = new Date().getFullYear();
        const yearConfig = config[`year${currentYear}`] as any;

        if (!yearConfig) return [];
        return yearConfig.terms;
      },

      getTermProgress: () => {
        const { currentTerm } = get();
        if (!currentTerm) return 0;

        const now = new Date();
        const start = new Date(currentTerm.startDate);
        const end = new Date(currentTerm.endDate);

        if (now < start) return 0;
        if (now > end) return 100;

        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();

        return Math.round((elapsed / total) * 100);
      },

      getRemainingWeeks: () => {
        const { currentTerm } = get();
        if (!currentTerm) return 0;

        const now = new Date();
        const end = new Date(currentTerm.endDate);

        if (now > end) return 0;

        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const remaining = end.getTime() - now.getTime();

        return Math.ceil(remaining / msPerWeek);
      },

      getCurrentWeek: () => {
        const { currentTerm } = get();
        if (!currentTerm) return 1;

        const now = new Date();
        const start = new Date(currentTerm.startDate);

        if (now < start) return 1;

        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const elapsed = now.getTime() - start.getTime();
        const week = Math.ceil(elapsed / msPerWeek);

        return Math.min(week, currentTerm.weeks);
      },
    }),
    {
      name: 'academic-term-storage',
      partialize: (state) => ({
        currentTerm: state.currentTerm,
        selectedSystem: state.selectedSystem,
        universityId: state.universityId,
      })
    }
  )
);

// Helper hook to initialize the term on app load
export function initializeAcademicTerm() {
  const { currentTerm, setCurrentTerm, selectedSystem } = useAcademicTermStore.getState();

  if (!currentTerm) {
    const term = getCurrentTerm(selectedSystem);
    if (term) {
      setCurrentTerm(term);
    }
  }
}

// Helper to format display strings
export function useTermDisplay() {
  const currentTerm = useAcademicTermStore((state) => state.currentTerm);
  const progress = useAcademicTermStore((state) => state.getTermProgress());
  const currentWeek = useAcademicTermStore((state) => state.getCurrentWeek());
  const remainingWeeks = useAcademicTermStore((state) => state.getRemainingWeeks());

  return {
    termName: currentTerm ? formatTermName(currentTerm) : 'No Active Term',
    progress,
    currentWeek,
    remainingWeeks,
    isTrimeser: currentTerm?.system === 'trimester',
  };
}

// Make store accessible globally for integration with other stores
if (typeof window !== 'undefined') {
  (window as any).__academicTermStore = useAcademicTermStore;
}