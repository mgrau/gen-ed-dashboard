import { describe, it, expect } from 'vitest'
import { evaluate } from './engine.js'

// ─── Minimal framework builders ────────────────────────────────────────────

function course(id, tags, credits = 3) {
  return { id, code: id, title: id, tags, credits }
}

/** Simple framework matching Framework A's structure */
const frameworkA = {
  id: 'test-a',
  sections: [
    { id: 'fys',         label: 'First Year Seminar', tags: ['fys'],         credits: 3 },
    { id: 'foundational', label: 'Foundational', subcategories: [
      { id: 'composition', label: 'Composition', tags: ['composition'], credits: 3 },
      { id: 'math',        label: 'Math',        tags: ['math'],        credits: 3 },
    ]},
    { id: 'goals', label: 'Goals', min_credits: 12, subcategories: [
      { id: 'inquiry',       label: 'Inquiry',       tags: ['goal_inquiry'],       min_credits: 3 },
      { id: 'reasoning',     label: 'Reasoning',     tags: ['goal_reasoning'],     min_credits: 3 },
      { id: 'communication', label: 'Communication', tags: ['goal_communication'], min_credits: 3 },
      { id: 'civic',         label: 'Civic',         tags: ['goal_civic'],         min_credits: 3 },
      { id: 'breadth', label: 'Breadth', overlay: true, subcategories: [
        { id: 'science', label: 'Science', tags: ['natural_science'], min_credits: 4, min_courses: 1 },
        { id: 'arts',    label: 'Arts',    tags: ['arts'],            min_credits: 3, min_courses: 1 },
        { id: 'social',  label: 'Social',  tags: ['social_science'],  min_credits: 3, min_courses: 1 },
      ]},
    ]},
    { id: 'capstone', label: 'Capstone', tags: ['capstone'], credits: 1 },
    { id: 'elective', label: 'Electives', min_credits: 6, elective: true },
  ]
}

// ─── Basic allocation ───────────────────────────────────────────────────────

describe('basic allocation', () => {
  it('assigns a course to the matching section', () => {
    const result = evaluate(frameworkA, [course('C1', ['fys'])])
    expect(result.sections.fys.courses).toHaveLength(1)
    expect(result.sections.fys.satisfied).toBe(true)
  })

  it('leaves unmatched sections unsatisfied', () => {
    const result = evaluate(frameworkA, [course('C1', ['fys'])])
    expect(result.sections.foundational.satisfied).toBe(false)
  })

  it('overall satisfied only when all sections are satisfied', () => {
    // Breadth is an overlay on the goals pool, so breadth-tagged courses must
    // also carry a goal tag to land in the goals pool and satisfy breadth.
    const result = evaluate(frameworkA, [
      course('C1',  ['fys']),
      course('C2',  ['composition']),
      course('C3',  ['math']),
      course('C4',  ['natural_science', 'goal_inquiry'], 4),  // fills inquiry + science breadth
      course('C5',  ['goal_reasoning']),
      course('C6',  ['arts', 'goal_communication']),           // fills communication + arts breadth
      course('C7',  ['social_science', 'goal_civic']),         // fills civic + social breadth
      course('CAP', ['capstone'], 1),
      course('E1',  ['other']),
      course('E2',  ['other']),
    ])
    expect(result.satisfied).toBe(true)
  })
})

// ─── Greedy allocation: most-constrained first ─────────────────────────────

describe('greedy allocation', () => {
  it('places a dual-tagged course into the section with greater deficit', () => {
    // goal_inquiry has min 3, goal_reasoning has min 3
    // A course with both tags should land in one of them
    const c = course('DUAL', ['goal_inquiry', 'goal_reasoning'])
    const result = evaluate(frameworkA, [c])
    const inInquiry   = result.sections.goals.subcategories.inquiry.courses.length
    const inReasoning = result.sections.goals.subcategories.reasoning.courses.length
    expect(inInquiry + inReasoning).toBe(1)
  })

  it('fills multiple goal sections when multiple courses are present', () => {
    const courses = [
      course('I1', ['goal_inquiry']),
      course('R1', ['goal_reasoning']),
      course('M1', ['goal_communication']),
      course('V1', ['goal_civic']),
    ]
    const result = evaluate(frameworkA, courses)
    const subs = result.sections.goals.subcategories
    expect(subs.inquiry.creditsFulfilled).toBe(3)
    expect(subs.reasoning.creditsFulfilled).toBe(3)
    expect(subs.communication.creditsFulfilled).toBe(3)
    expect(subs.civic.creditsFulfilled).toBe(3)
  })
})

// ─── Pass 2: overflow absorption ───────────────────────────────────────────

describe('pass 2 overflow', () => {
  it('absorbs extra goal courses until parent min_credits is met', () => {
    const courses = [
      course('I1', ['goal_inquiry']),
      course('I2', ['goal_inquiry']),
      course('I3', ['goal_inquiry']),
      course('I4', ['goal_inquiry']),
      course('I5', ['goal_inquiry']),
    ]
    const result = evaluate(frameworkA, courses)
    const subs = result.sections.goals.subcategories
    const inGoals = subs.inquiry.creditsFulfilled
    // 12 cr min for goals parent; 4 courses = 12 cr exactly, 5th goes to electives
    expect(inGoals).toBe(12)
    expect(result.sections.elective.courses).toHaveLength(1)
  })

  it('sends courses to electives once goals parent min_credits is met', () => {
    const courses = Array.from({ length: 6 }, (_, i) => course(`I${i}`, ['goal_inquiry']))
    const result = evaluate(frameworkA, courses)
    // 12 cr fills goals, 2 extra (6 cr) go to electives
    expect(result.sections.elective.courses).toHaveLength(2)
  })
})

// ─── Overlay sections ──────────────────────────────────────────────────────

describe('overlay (disciplinary breadth)', () => {
  it('satisfies breadth from a course already assigned to goals', () => {
    const courses = [
      course('SCI', ['natural_science', 'goal_inquiry'], 4),
      course('R1',  ['goal_reasoning']),
      course('M1',  ['goal_communication']),
      course('V1',  ['goal_civic']),
    ]
    const result = evaluate(frameworkA, courses)
    const breadth = result.sections.goals.subcategories.breadth.subcategories
    expect(breadth.science.satisfied).toBe(true)
    expect(breadth.science.courses).toHaveLength(1)
  })

  it('does not consume a global pool slot for the breadth overlay', () => {
    const courses = [
      course('SCI', ['natural_science', 'goal_inquiry'], 4),
      course('R1',  ['goal_reasoning']),
      course('M1',  ['goal_communication']),
      course('V1',  ['goal_civic']),
    ]
    const result = evaluate(frameworkA, courses)
    // SCI should be in inquiry, not double-counted as a separate allocation
    const inquiry = result.sections.goals.subcategories.inquiry
    expect(inquiry.courses.some(c => c.id === 'SCI')).toBe(true)
  })

  it('breadth unsatisfied when no matching course reaches the goals pool', () => {
    const courses = [
      course('I1', ['goal_inquiry']),
      course('R1', ['goal_reasoning']),
      course('M1', ['goal_communication']),
      course('V1', ['goal_civic']),
    ]
    const result = evaluate(frameworkA, courses)
    const breadth = result.sections.goals.subcategories.breadth.subcategories
    expect(breadth.science.satisfied).toBe(false)
  })
})

// ─── Elective catch-all ────────────────────────────────────────────────────

describe('elective section', () => {
  it('catches courses with no matching allocating section', () => {
    const result = evaluate(frameworkA, [course('X', ['unknown_tag'])])
    expect(result.sections.elective.courses).toHaveLength(1)
  })

  it('is satisfied when elective min_credits threshold is met', () => {
    const courses = [course('E1', ['other']), course('E2', ['other'])]
    const result = evaluate(frameworkA, courses)
    expect(result.sections.elective.satisfied).toBe(true)
  })

  it('is unsatisfied when below elective min_credits', () => {
    const result = evaluate(frameworkA, [course('E1', ['other'])])
    expect(result.sections.elective.satisfied).toBe(false)
  })
})

// ─── Credit and course counting ────────────────────────────────────────────

describe('credit and course counting', () => {
  it('tracks creditsFulfilled correctly', () => {
    const result = evaluate(frameworkA, [course('I1', ['goal_inquiry'], 3)])
    expect(result.sections.goals.subcategories.inquiry.creditsFulfilled).toBe(3)
  })

  it('respects credits hard cap — does not double-fill a fixed section', () => {
    const courses = [course('F1', ['fys']), course('F2', ['fys'])]
    const result = evaluate(frameworkA, courses)
    // FYS has credits: 3 — only one course should land there
    expect(result.sections.fys.courses).toHaveLength(1)
  })

  it('satisfies a min_courses: 1 requirement with one course', () => {
    const courses = [
      course('SCI', ['natural_science', 'goal_inquiry'], 4),
      course('R1', ['goal_reasoning']),
      course('M1', ['goal_communication']),
      course('V1', ['goal_civic']),
    ]
    const result = evaluate(frameworkA, courses)
    expect(result.sections.goals.subcategories.breadth.subcategories.science.coursesFulfilled).toBe(1)
  })
})
