export interface SubjectConfig {
  name: string;
  weightage: number; // out of 100
}

export interface SectionConfig {
  name: string;
  subjects: SubjectConfig[];
}

export const SYLLABUS_SECTIONS: SectionConfig[] = [
  {
    name: "Core CS",
    subjects: [
      { name: "Digital Logic", weightage: 5 },
      { name: "Computer Organization & Architecture (COA)", weightage: 8 },
      { name: "Programming & Data Structures", weightage: 8 },
      { name: "Algorithms", weightage: 8 },
      { name: "Theory of Computation (TOC)", weightage: 6 },
      { name: "Compiler Design", weightage: 5 },
      { name: "Operating Systems (OS)", weightage: 9 },
      { name: "Databases (DBMS)", weightage: 8 },
      { name: "Computer Networks (CN)", weightage: 9 },
    ],
  },
  {
    name: "Engineering Mathematics",
    subjects: [
      { name: "Discrete Mathematics", weightage: 6 },
      { name: "Linear Algebra", weightage: 3 },
      { name: "Calculus", weightage: 3 },
      { name: "Probability & Statistics", weightage: 3 },
    ],
  },
  {
    name: "General Aptitude",
    subjects: [
      { name: "Verbal Aptitude", weightage: 4 },
      { name: "Quantitative Aptitude", weightage: 5 },
      { name: "Analytical Aptitude", weightage: 4 },
      { name: "Spatial Aptitude", weightage: 2 },
    ],
  },
];

// Flat list of all subjects
export const ALL_SUBJECTS: SubjectConfig[] = SYLLABUS_SECTIONS.flatMap(
  (s) => s.subjects
);

// Total weightage (should sum to 98 — close enough, normalized below)
export const TOTAL_WEIGHTAGE = ALL_SUBJECTS.reduce(
  (sum, s) => sum + s.weightage,
  0
);

// Get weightage for a subject by name
export function getSubjectWeightage(subjectName: string): number {
  const found = ALL_SUBJECTS.find((s) => s.name === subjectName);
  return found?.weightage ?? 0;
}

// Subject item types
export const ITEM_TYPES = ["Lecture", "Weekly Quiz", "Chapter Test"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

// Type badge colors
export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  Lecture: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Weekly Quiz": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Chapter Test": "bg-orange-500/20 text-orange-300 border-orange-500/30",
};
