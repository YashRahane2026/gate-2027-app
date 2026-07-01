export interface SubjectConfig {
  name: string;
  weightage: number; // out of 100
}

export interface SectionConfig {
  name: string;
  subjects: SubjectConfig[];
}

export const CSE_SYLLABUS_SECTIONS: SectionConfig[] = [
  {
    name: "Core CS",
    subjects: [
      { name: "Digital Logic", weightage: 5 },
      { name: "Computer Organization & Architecture (COA)", weightage: 8 },
      { name: "Programming & Data Structures", weightage: 10 },
      { name: "Algorithms", weightage: 10 },
      { name: "Theory of Computation (TOC)", weightage: 8 },
      { name: "Compiler Design", weightage: 4 },
      { name: "Operating Systems (OS)", weightage: 9 },
      { name: "Databases (DBMS)", weightage: 8 },
      { name: "Computer Networks (CN)", weightage: 8 },
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

export const DA_SYLLABUS_SECTIONS: SectionConfig[] = [
  {
    name: "Core DA",
    subjects: [
      { name: "Programming, Data Structures & Algorithms", weightage: 20 },
      { name: "Database Management & Warehousing", weightage: 10 },
      { name: "Machine Learning", weightage: 16 },
      { name: "Artificial Intelligence", weightage: 9 },
    ],
  },
  {
    name: "Engineering Mathematics",
    subjects: [
      { name: "Probability & Statistics", weightage: 14 },
      { name: "Linear Algebra", weightage: 10 },
      { name: "Calculus & Optimization", weightage: 6 },
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

// Helper to get active sections by stream selection
export function getSyllabusSections(stream: "CSE" | "DA"): SectionConfig[] {
  return stream === "DA" ? DA_SYLLABUS_SECTIONS : CSE_SYLLABUS_SECTIONS;
}

// Flat union list of all subjects (for dropdowns and pings)
export const ALL_SUBJECTS: SubjectConfig[] = [
  ...CSE_SYLLABUS_SECTIONS.flatMap((s) => s.subjects),
  ...DA_SYLLABUS_SECTIONS.flatMap((s) => s.subjects),
].filter((value, index, self) =>
  self.findIndex((t) => t.name === value.name) === index
);

// Get weightage for a subject by name and stream
export function getSubjectWeightage(subjectName: string, stream: "CSE" | "DA" = "CSE"): number {
  const sections = getSyllabusSections(stream);
  const subjects = sections.flatMap((s) => s.subjects);
  const found = subjects.find((s) => s.name === subjectName);
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
