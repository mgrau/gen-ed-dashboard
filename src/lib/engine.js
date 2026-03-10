/**
 * Requirement evaluation engine.
 *
 * Exclusivity and overflow rules:
 *  1. FYS          → locked exclusively, never reused
 *  2. Composition  → locked exclusively, never reused
 *  3. Math         → ONE course locked; extras free for Goals
 *  4. Goals        → only as many courses as needed to reach minimums + 19-credit total
 *                    are locked. Surplus goal-eligible courses stay unlocked.
 *  5. Electives    → all unlocked courses (includes surplus goal courses)
 *  6. Capstone     → locked exclusively
 *
 * Display rule: each result.courses contains ONLY the courses actively
 * fulfilling that requirement — extras are not listed.
 */

export function evaluate(framework, placedCourses) {
  const usedIds = new Set()
  const sectionResults = {}

  for (const section of framework.sections) {
    let result
    switch (section.type) {
      case 'fixed':   result = evaluateFixed(section, placedCourses, usedIds); break
      case 'group':   result = evaluateFoundational(section, placedCourses, usedIds); break
      case 'goals':   result = evaluateGoals(section, placedCourses, usedIds); break
      case 'elective':result = evaluateElective(section, placedCourses, usedIds); break
      default:        result = evaluateFixed(section, placedCourses, usedIds)
    }
    sectionResults[section.id] = result
  }

  return {
    satisfied: Object.values(sectionResults).every(r => r.satisfied),
    sections: sectionResults
  }
}

/** Locks all matching courses to this section */
function evaluateFixed(section, placedCourses, usedIds) {
  const matching = placedCourses.filter(c =>
    !usedIds.has(c.id) && c.tags.some(t => section.course_tags?.includes(t))
  )
  matching.forEach(c => usedIds.add(c.id))
  const credits = sumCredits(matching)
  return {
    satisfied: credits >= section.credits_required,
    creditsFulfilled: credits,
    creditsRequired: section.credits_required,
    courses: matching
  }
}

/**
 * Foundational group.
 * Composition: all matching locked.
 * Math: only ONE course locked; extras remain free for Goals.
 *
 * Selection rule: when locking a single course, prefer the one with the fewest
 * tags that contribute to other requirements (goals, breadth). This ensures
 * multi-tagged courses (e.g. math_foundational + goal_reasoning) are freed up
 * to satisfy goals, regardless of the order courses were placed.
 */

// Tags that can contribute to sections evaluated after foundational
const PORTABLE_TAGS = new Set([
  'goal_inquiry', 'goal_reasoning', 'goal_communication', 'goal_civic',
  'natural_science_lab', 'arts_humanities', 'social_science'
])

function portableTagCount(course) {
  return course.tags.filter(t => PORTABLE_TAGS.has(t)).length
}

function evaluateFoundational(section, placedCourses, usedIds) {
  const subsections = {}
  for (const sub of section.subsections) {
    const available = placedCourses.filter(c =>
      !usedIds.has(c.id) && c.tags.some(t => sub.course_tags?.includes(t))
    )
    // Only lock ONE course for math and composition; extras are free for goals/electives.
    // Sort so the course with the fewest portable tags is locked first.
    let locked
    if (sub.id === 'math' || sub.id === 'composition') {
      const sorted = available.slice().sort((a, b) => portableTagCount(a) - portableTagCount(b))
      locked = sorted.slice(0, 1)
    } else {
      locked = available
    }
    locked.forEach(c => usedIds.add(c.id))
    const credits = sumCredits(locked)
    subsections[sub.id] = {
      satisfied: credits >= sub.credits_required,
      creditsFulfilled: credits,
      creditsRequired: sub.credits_required,
      courses: locked
    }
  }
  const allSatisfied = Object.values(subsections).every(r => r.satisfied)
  return {
    satisfied: allSatisfied,
    creditsFulfilled: Object.values(subsections).reduce((s, r) => s + r.creditsFulfilled, 0),
    creditsRequired: section.credits_required,
    subsections
  }
}

/**
 * Goals section.
 *
 * Allocation:
 *   Pass 1 — assign single-goal courses to their goal.
 *   Pass 2 — assign double-tagged courses to the least-filled goal.
 *
 * Trimming to avoid over-counting:
 *   For each goal, only keep courses up to the goal's credit minimum.
 *   Then fill up to the section total (19 cr) with remaining courses.
 *   Anything beyond the section total is left unlocked → spills to Electives.
 *
 * Breadth: evaluated independently across all placed courses (a course
 * can satisfy breadth AND a goal simultaneously). Only courses up to the
 * breadth requirement are listed.
 */
function evaluateGoals(section, placedCourses, usedIds) {
  const goalTags = section.goals.map(g => g.tag)
  const eligible = placedCourses.filter(c =>
    !usedIds.has(c.id) && c.tags.some(t => goalTags.includes(t))
  )

  // --- Allocate to goals ---
  const allocation = Object.fromEntries(section.goals.map(g => [g.id, []]))
  const assigned = new Set()

  // Pass 1: single-goal courses
  for (const course of eligible) {
    const matching = section.goals.filter(g => course.tags.includes(g.tag))
    if (matching.length === 1) {
      allocation[matching[0].id].push(course)
      assigned.add(course.id)
    }
  }
  // Pass 2: double-tagged → least-filled goal
  for (const course of eligible) {
    if (assigned.has(course.id)) continue
    const matching = section.goals.filter(g => course.tags.includes(g.tag))
    if (!matching.length) continue
    const target = matching.reduce((least, g) =>
      sumCredits(allocation[g.id]) < sumCredits(allocation[least.id]) ? g : least
    )
    allocation[target.id].push(course)
    assigned.add(course.id)
  }

  // --- Trim to only what's needed ---
  const used = Object.fromEntries(section.goals.map(g => [g.id, []]))
  let totalUsed = 0

  // Step 1: fill each goal to its minimum
  for (const goal of section.goals) {
    let goalCredits = 0
    for (const course of allocation[goal.id]) {
      if (goalCredits >= goal.credits_required) break
      used[goal.id].push(course)
      goalCredits += course.credits
      totalUsed += course.credits
    }
  }

  // Step 2: fill remaining budget up to section total
  for (const goal of section.goals) {
    for (const course of allocation[goal.id]) {
      if (used[goal.id].includes(course)) continue   // already counted
      if (totalUsed >= section.credits_required) break
      used[goal.id].push(course)
      totalUsed += course.credits
    }
    if (totalUsed >= section.credits_required) break
  }

  // Lock only courses that are actively used for goals
  for (const goal of section.goals) {
    used[goal.id].forEach(c => usedIds.add(c.id))
  }
  // Surplus goal-eligible courses remain unlocked → electives will pick them up

  // Score goals
  const goalResults = {}
  let allGoalsSatisfied = true
  for (const goal of section.goals) {
    const credits = sumCredits(used[goal.id])
    const satisfied = credits >= goal.credits_required
    if (!satisfied) allGoalsSatisfied = false
    goalResults[goal.id] = {
      satisfied,
      creditsFulfilled: credits,
      creditsRequired: goal.credits_required,
      courses: used[goal.id]
    }
  }

  // Breadth: take only as many courses as needed to satisfy each breadth requirement
  const breadthResults = {}
  let allBreadthSatisfied = true
  for (const b of section.breadth) {
    const matching = placedCourses.filter(c => c.tags.includes(b.tag))
    const needed = []
    let breadthCredits = 0
    for (const course of matching) {
      if (breadthCredits >= b.credits_required) break
      needed.push(course)
      breadthCredits += course.credits
    }
    const satisfied = breadthCredits >= b.credits_required
    if (!satisfied) allBreadthSatisfied = false
    breadthResults[b.id] = {
      satisfied,
      creditsFulfilled: breadthCredits,
      creditsRequired: b.credits_required,
      courses: needed
    }
  }

  return {
    satisfied: allGoalsSatisfied && totalUsed >= section.credits_required && allBreadthSatisfied,
    creditsFulfilled: totalUsed,
    creditsRequired: section.credits_required,
    goals: goalResults,
    breadth: breadthResults
  }
}

/**
 * Electives: any course not locked to another requirement.
 * This naturally includes surplus goal-tagged courses since they were not locked.
 */
function evaluateElective(section, placedCourses, usedIds) {
  const available = placedCourses.filter(c => !usedIds.has(c.id))
  available.forEach(c => usedIds.add(c.id))
  const credits = sumCredits(available)
  return {
    satisfied: credits >= section.credits_required,
    creditsFulfilled: credits,
    creditsRequired: section.credits_required,
    courses: available,
    note: section.note
  }
}

function sumCredits(courses) {
  return courses.reduce((sum, c) => sum + (c.credits || 0), 0)
}
