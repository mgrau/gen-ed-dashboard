/**
 * Visual metadata for each course tag.
 * Used by CourseCard to render colored badges and tooltips.
 */
export const TAG_META = {
  fys:               { label: 'First Year Seminar',            short: 'FYS',  color: 'bg-slate-100 text-slate-700 border-slate-300' },
  composition:       { label: 'Foundational Composition',      short: 'COMP', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  math_foundational: { label: 'Foundational Math',             short: 'MATH', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  gened_capstone:    { label: 'Gen Ed Capstone',               short: 'CAP',  color: 'bg-gray-100 text-gray-600 border-gray-300' },
  goal_inquiry:      { label: 'Inquiry & Research',            short: 'INQ',  color: 'bg-blue-100 text-blue-700 border-blue-300' },
  goal_reasoning:    { label: 'Reasoning & Problem Solving',   short: 'RSN',  color: 'bg-amber-100 text-amber-700 border-amber-300' },
  goal_communication:{ label: 'Communication & Expression',    short: 'COMM', color: 'bg-green-100 text-green-700 border-green-300' },
  goal_civic:        { label: 'Civic Engagement',              short: 'CIV',  color: 'bg-purple-100 text-purple-700 border-purple-300' },
  natural_science:   { label: 'Natural Science',               short: 'SCI',  color: 'bg-teal-100 text-teal-700 border-teal-300' },
  arts_humanities:   { label: 'Arts & Humanities',             short: 'A&H',  color: 'bg-pink-100 text-pink-700 border-pink-300' },
  social_science:    { label: 'Behavioral/Social Science',     short: 'BSS',  color: 'bg-orange-100 text-orange-700 border-orange-300' },
}

/** Returns human-readable list of what a course can fulfill */
export function fulfillableLabels(course) {
  return course.tags
    .filter(t => TAG_META[t])
    .map(t => TAG_META[t].label)
}
