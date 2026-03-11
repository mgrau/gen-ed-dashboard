/**
 * Requirement evaluation engine.
 *
 * Schema:
 *   section.tags:          string[]   courses must match at least one tag (OR logic)
 *   section.credits:       number     fixed amount — both min and allocation cap
 *   section.min_credits:   number     satisfaction threshold; allocation stops at this cap
 *   section.max_credits:   number     same as credits (only-max = same as credits)
 *   section.min_credits + max_credits: min for satisfaction, max for allocation cap
 *   section.courses:       number     fixed course count — both min and cap
 *   section.min_courses:   number     minimum distinct courses required
 *   section.max_courses:   number     same as courses
 *   section.subcategories: section[]  nested requirements
 *   section.overlay:       boolean    evaluated against parent's already-assigned courses,
 *                                     not the global pool; no courses consumed
 *   section.elective:      boolean    catch-all for unassigned courses
 *   section.note:          string     display note
 *
 * Allocation:
 *   Each course is assigned to exactly one non-overlay leaf section.
 *   The greedy algorithm maximises satisfied requirements by processing
 *   the most-constrained courses first and filling the most-urgent sections.
 *   Overlay sections are excluded from allocation entirely; they are evaluated
 *   post-hoc against the courses already assigned to their parent.
 *
 * Overlay tiebreaker:
 *   When two courses are equally constrained (same number of eligible sections),
 *   prefer the one carrying overlay-useful tags. This ensures that a course
 *   eligible for both a learning goal and a disciplinary breadth area lands
 *   in the goal pool rather than being displaced to electives.
 */

export function evaluate(framework, placedCourses) {
  const leaves = []
  collectLeaves(framework.sections, leaves)
  const elective = findFirst(framework.sections, s => s.elective)
  const overlayTags = collectAllOverlayTags(framework.sections)
  const parentMap = buildParentMap(framework.sections)

  const assignment = allocate(leaves, elective, placedCourses, overlayTags, parentMap)

  const sectionResults = {}
  for (const section of framework.sections) {
    sectionResults[section.id] = buildResult(section, assignment, placedCourses)
  }

  return {
    satisfied: Object.values(sectionResults).every(r => r.satisfied),
    sections: sectionResults
  }
}

// ─── Schema helpers ────────────────────────────────────────────────────────────

function minCredits(s) {
  return s.credits ?? s.max_credits ?? s.min_credits ?? 0
}

function maxCredits(s) {
  if (s.min_credits != null && s.max_credits != null) return s.max_credits
  return s.credits ?? s.max_credits ?? s.min_credits ?? Infinity
}

function minCourses(s) {
  return s.courses ?? s.max_courses ?? s.min_courses ?? 0
}

function maxCourses(s) {
  if (s.min_courses != null && s.max_courses != null) return s.max_courses
  return s.courses ?? s.max_courses ?? s.min_courses ?? Infinity
}

// ─── Tree traversal ────────────────────────────────────────────────────────────

/** Collect all allocating leaf sections (skips overlay subtrees and electives). */
function collectLeaves(sections, out) {
  for (const s of sections) {
    if (s.overlay) continue
    if (s.subcategories?.length) collectLeaves(s.subcategories, out)
    else if (!s.elective) out.push(s)
  }
}

/** Collect the IDs of all allocating leaf sections under a given section. */
function collectLeafIds(section, out) {
  if (section.overlay) return
  if (section.subcategories?.length) {
    for (const sub of section.subcategories) collectLeafIds(sub, out)
  } else if (!section.elective) {
    out.add(section.id)
  }
}

/** Build a map from section id → parent section object. */
function buildParentMap(sections, parent = null, map = new Map()) {
  for (const s of sections) {
    if (parent !== null) map.set(s.id, parent)
    if (s.subcategories?.length) buildParentMap(s.subcategories, s, map)
  }
  return map
}

function findFirst(sections, predicate) {
  for (const s of sections) {
    if (predicate(s)) return s
    if (s.subcategories) {
      const found = findFirst(s.subcategories, predicate)
      if (found) return found
    }
  }
  return null
}

/** Collect all tags referenced inside overlay subtrees. */
function collectAllOverlayTags(sections) {
  const tags = new Set()
  function recurse(sections) {
    for (const s of sections) {
      if (s.overlay) {
        collectTagsDeep(s, tags)
      } else if (s.subcategories) {
        recurse(s.subcategories)
      }
    }
  }
  recurse(sections)
  return tags
}

function collectTagsDeep(section, out) {
  section.tags?.forEach(t => out.add(t))
  section.subcategories?.forEach(sub => collectTagsDeep(sub, out))
}

// ─── Allocation ────────────────────────────────────────────────────────────────

/**
 * Assigns each course to exactly one allocating leaf section.
 * Overlay sections play no role here — they are evaluated later in buildResult.
 *
 * Two-pass algorithm:
 *
 *   Pass 1 — satisfy minimums (greedy):
 *     Process most-constrained courses first. Assign each to the eligible section
 *     with the greatest unmet deficit. The allocation cap equals the section's
 *     minimum (or explicit max), so courses overflow to other sections once a
 *     minimum is met. Tiebreak: prefer courses with overlay-useful tags so they
 *     land in the parent pool and can satisfy breadth checks.
 *
 *   Pass 2 — absorb remaining courses in YAML order:
 *     Any course not placed in Pass 1 is assigned to the first eligible section
 *     (in framework definition order: FYS → Foundational → Goals → Capstone)
 *     that has no explicit maximum. Sections with only min_credits accept
 *     unlimited additional courses in this pass. This ensures that extra inquiry
 *     courses stay in Inquiry rather than falling through to Electives.
 */
function allocate(leaves, elective, courses, overlayTags, parentMap) {
  const assignment = new Map()
  const secCredits = new Map(leaves.map(s => [s.id, 0]))
  const secCount   = new Map(leaves.map(s => [s.id, 0]))

  function canAccept(s, course) {
    return secCredits.get(s.id) < maxCredits(s) &&
           secCount.get(s.id)   < maxCourses(s)
  }

  function isEligible(s, course) {
    if (!s.tags?.length) return true
    return course.tags.some(t => s.tags.includes(t))
  }

  function deficit(s) {
    return Math.max(0, minCredits(s) - secCredits.get(s.id))
  }

  const unassigned = new Set(courses.map(c => c.id))

  // ── Pass 1: fill minimums ──────────────────────────────────────────────────
  let changed = true
  while (changed) {
    changed = false

    const pending = courses
      .filter(c => unassigned.has(c.id))
      .map(c => ({
        course: c,
        options: leaves.filter(s => isEligible(s, c) && canAccept(s, c) && deficit(s) > 0),
        hasOverlayTag: overlayTags.size > 0 && c.tags.some(t => overlayTags.has(t))
      }))
      .filter(x => x.options.length > 0)
      .sort((a, b) => {
        if (a.options.length !== b.options.length) return a.options.length - b.options.length
        // Tiebreak: overlay-useful courses first so they land in the parent pool
        return (b.hasOverlayTag ? 1 : 0) - (a.hasOverlayTag ? 1 : 0)
      })

    for (const { course, options } of pending) {
      if (!unassigned.has(course.id)) continue

      const live = options.filter(s => canAccept(s, course) && deficit(s) > 0)
      if (!live.length) continue

      const target = live.reduce((best, s) => deficit(s) > deficit(best) ? s : best)

      assignment.set(course.id, target.id)
      unassigned.delete(course.id)
      secCredits.set(target.id, secCredits.get(target.id) + course.credits)
      secCount.set(target.id, secCount.get(target.id) + 1)
      changed = true
    }
  }

  // ── Pass 2: absorb leftovers in YAML order ─────────────────────────────────
  // Sections without an explicit max (only min_credits set) accept additional
  // courses only while their parent's min_credits has not yet been reached.
  // Once the parent is satisfied, extra courses fall through to Electives.
  for (const course of courses) {
    if (!unassigned.has(course.id)) continue

    const target = leaves.find(s => {
      if (hasExplicitMax(s) || !isEligible(s, course)) return false
      const par = parentMap.get(s.id)
      if (par?.min_credits != null) {
        const leafIds = new Set()
        collectLeafIds(par, leafIds)
        const parentTotal = [...leafIds].reduce((sum, id) => sum + (secCredits.get(id) ?? 0), 0)
        if (parentTotal >= par.min_credits) return false
      }
      return true
    })
    if (target) {
      assignment.set(course.id, target.id)
      unassigned.delete(course.id)
      secCredits.set(target.id, secCredits.get(target.id) + course.credits)
      secCount.set(target.id, secCount.get(target.id) + 1)
    }
  }

  // Remaining → elective catch-all
  for (const id of unassigned) {
    assignment.set(id, elective?.id ?? null)
  }

  return assignment
}

/** True when the section has an explicit upper bound on credits or courses. */
function hasExplicitMax(s) {
  return s.credits != null || s.max_credits != null || s.courses != null || s.max_courses != null
}

// ─── Result builder ────────────────────────────────────────────────────────────

function buildResult(section, assignment, allCourses) {
  if (section.elective) {
    const courses = allCourses.filter(c => assignment.get(c.id) === section.id)
    const credits = sumCredits(courses)
    return {
      satisfied: credits >= minCredits(section),
      creditsFulfilled: credits,
      creditsRequired: minCredits(section),
      courses
    }
  }

  if (section.subcategories?.length) {
    const allocating = section.subcategories.filter(s => !s.overlay)
    const overlays   = section.subcategories.filter(s => s.overlay)

    // Build results for allocating subcategories
    const subcategories = {}
    let totalCredits = 0
    let totalRequired = 0
    let allAllocatingSatisfied = true

    for (const sub of allocating) {
      const r = buildResult(sub, assignment, allCourses)
      subcategories[sub.id] = r
      totalCredits  += r.creditsFulfilled
      totalRequired += r.creditsRequired
      if (!r.satisfied) allAllocatingSatisfied = false
    }

    // Build overlay results against the parent pool
    // (all courses assigned to any allocating leaf under this section)
    let allOverlaysSatisfied = true
    if (overlays.length > 0) {
      const parentLeafIds = new Set()
      for (const sub of allocating) collectLeafIds(sub, parentLeafIds)
      const parentPool = allCourses.filter(c => parentLeafIds.has(assignment.get(c.id)))

      for (const overlay of overlays) {
        const r = buildOverlayResult(overlay, parentPool)
        subcategories[overlay.id] = r
        if (!r.satisfied) allOverlaysSatisfied = false
      }
    }

    const parentMin = minCredits(section)
    const creditsRequired = Math.max(parentMin, totalRequired)

    return {
      satisfied: allAllocatingSatisfied && allOverlaysSatisfied && totalCredits >= parentMin,
      creditsFulfilled: totalCredits,
      creditsRequired,
      subcategories
    }
  }

  // Leaf section
  const courses = allCourses.filter(c => assignment.get(c.id) === section.id)
  const credits = sumCredits(courses)
  const count = courses.length

  return {
    satisfied: credits >= minCredits(section) && count >= minCourses(section),
    creditsFulfilled: credits,
    creditsRequired: minCredits(section),
    coursesFulfilled: count,
    coursesRequired: minCourses(section),
    courses
  }
}

/**
 * Evaluate an overlay section against the parent's already-assigned course pool.
 * No courses are consumed from the global pool.
 */
function buildOverlayResult(section, parentPool) {
  if (section.subcategories?.length) {
    const subcategories = {}
    let allSatisfied = true
    for (const sub of section.subcategories) {
      const r = buildOverlayResult(sub, parentPool)
      subcategories[sub.id] = r
      if (!r.satisfied) allSatisfied = false
    }
    return {
      satisfied: allSatisfied,
      creditsFulfilled: 0,
      creditsRequired: 0,
      subcategories
    }
  }

  // Overlay leaf: filter parent pool by this section's tags
  const matching = parentPool.filter(c => c.tags.some(t => section.tags?.includes(t)))
  const needed = []
  let credits = 0
  const cap = maxCredits(section)
  for (const course of matching) {
    if (credits >= cap) break
    needed.push(course)
    credits += course.credits
  }

  return {
    satisfied: credits >= minCredits(section) && needed.length >= minCourses(section),
    creditsFulfilled: credits,
    creditsRequired: minCredits(section),
    coursesFulfilled: needed.length,
    coursesRequired: minCourses(section),
    courses: needed
  }
}

function sumCredits(courses) {
  return courses.reduce((sum, c) => sum + (c.credits || 0), 0)
}
