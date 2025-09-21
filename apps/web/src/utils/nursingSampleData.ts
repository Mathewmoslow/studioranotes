// Placeholder nursing sample data for dataLoader
// This file contains sample nursing course data

export interface NursingCourse {
  name: string;
  code: string;
  professor: string;
  credits: number;
  color: string;
}

export interface NursingScheduleItem {
  course: string;
  type: string;
  title: string;
  date: string;
  duration: string;
}

export const nursingCourses: NursingCourse[] = [
  {
    name: "Adult Health Nursing",
    code: "NURS310",
    professor: "Dr. Smith",
    credits: 3,
    color: "#3b82f6"
  },
  {
    name: "Gerontological Nursing",
    code: "NURS315",
    professor: "Dr. Johnson",
    credits: 2,
    color: "#10b981"
  },
  {
    name: "NCLEX Preparation",
    code: "NURS335",
    professor: "Dr. Williams",
    credits: 1,
    color: "#f59e0b"
  },
  {
    name: "Obstetrics & Gynecology",
    code: "NURS330",
    professor: "Dr. Brown",
    credits: 4,
    color: "#8b5cf6"
  }
];

export const nursingScheduleItems: NursingScheduleItem[] = [
  {
    course: "Adult_310",
    type: "Lecture",
    title: "Introduction to Adult Health",
    date: "2025-02-01",
    duration: "3:00:00"
  },
  {
    course: "Adult_310",
    type: "Assignment",
    title: "Care Plan Development",
    date: "2025-02-07",
    duration: "4:00:00"
  },
  {
    course: "Gerontology_315",
    type: "Lecture",
    title: "Aging Process",
    date: "2025-02-03",
    duration: "1:30:00"
  },
  {
    course: "Gerontology_315",
    type: "Reading",
    title: "Geriatric Assessment",
    date: "2025-02-10",
    duration: "2:00:00"
  },
  {
    course: "NCLEX_335",
    type: "Quiz",
    title: "Practice Questions Set 1",
    date: "2025-02-05",
    duration: "1:00:00"
  },
  {
    course: "OBGYN_330",
    type: "Clinical",
    title: "Labor & Delivery Rotation",
    date: "2025-02-08",
    duration: "8:00:00"
  }
];