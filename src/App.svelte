<script>
  import { writable } from 'svelte/store'
  import frameworkA from '../data/frameworks/framework-a.yaml'
  import frameworkB from '../data/frameworks/framework-b.yaml'
  import allCourses from '../data/courses.yaml'
  import FrameworkTabs from './components/FrameworkTabs.svelte'
  import RequirementsTracker from './components/RequirementsTracker.svelte'
  // FrameworkEditor (+ CodeMirror) is lazy-loaded on first use
  let FrameworkEditor = null
  $: if (editMode && !FrameworkEditor) {
    import('./components/FrameworkEditor.svelte').then(m => { FrameworkEditor = m.default })
  }
  import SemesterPlanner from './components/SemesterPlanner.svelte'
  import CourseCard from './components/CourseCard.svelte'
  import { evaluate } from './lib/engine.js'
  import { TAG_META } from './lib/tags.js'
  import CreditSummaryBar from './components/CreditSummaryBar.svelte'

  const baseFrameworks = [frameworkA, frameworkB]
  let activeFrameworkIndex = 0
  let editMode = false
  let compareMode = false

  // Per-framework overrides from the live editor (in-memory only)
  let frameworkOverrides = {}
  $: activeFramework = frameworkOverrides[activeFrameworkIndex] ?? baseFrameworks[activeFrameworkIndex]

  function handleFrameworkEdit(updated) {
    frameworkOverrides = { ...frameworkOverrides, [activeFrameworkIndex]: updated }
  }

  const semesterLabels = [
    'Fall Year 1', 'Spring Year 1',
    'Fall Year 2', 'Spring Year 2',
    'Fall Year 3', 'Spring Year 3',
    'Fall Year 4', 'Spring Year 4'
  ]

  const STORAGE_KEY = 'odu-gened-semesters'
  const courseMap = Object.fromEntries(allCourses.courses.map(c => [c.id, c]))

  function encodeState(semMap) {
    const compact = {}
    semesterLabels.forEach((label, i) => {
      if (semMap[label]?.length) compact[i] = semMap[label].map(c => c.id)
    })
    return btoa(JSON.stringify(compact))
  }

  function decodeState(encoded) {
    try {
      const compact = JSON.parse(atob(encoded))
      const result = Object.fromEntries(semesterLabels.map(l => [l, []]))
      for (const [idx, ids] of Object.entries(compact)) {
        const label = semesterLabels[parseInt(idx)]
        if (label) result[label] = ids.map(id => courseMap[id]).filter(Boolean)
      }
      return result
    } catch (_) { return null }
  }

  function loadSemesters() {
    // URL hash takes priority (enables sharing)
    const hash = location.hash.slice(1)
    if (hash) {
      const decoded = decodeState(hash)
      if (decoded) return decoded
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (_) {}
    return Object.fromEntries(semesterLabels.map(label => [label, []]))
  }

  const semesters = writable(loadSemesters())
  semesters.subscribe(value => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch (_) {}
  })

  let copyConfirmed = false
  function copyLink() {
    const hasContent = Object.values($semesters).some(c => c.length > 0)
    const url = hasContent
      ? `${location.origin}${location.pathname}#${encodeState($semesters)}`
      : location.href
    navigator.clipboard.writeText(url).then(() => {
      copyConfirmed = true
      setTimeout(() => copyConfirmed = false, 2000)
    })
  }

  $: placedCourses = Object.values($semesters).flat()
  $: placedIds = new Set(placedCourses.map(c => c.id))
  $: pool = allCourses.courses.filter(c => !placedIds.has(c.id))
  $: evaluation = evaluate(activeFramework, placedCourses)
  $: allEvaluations = baseFrameworks.map((fw, i) => evaluate(frameworkOverrides[i] ?? fw, placedCourses))

  /** Map courseId → the label of its assigned leaf section. */
  function buildAssignmentMap(sections, evalSections) {
    const map = {}
    function walk(sections, evalSecs) {
      for (const s of sections) {
        if (s.overlay || s.elective) continue
        const result = evalSecs?.[s.id]
        if (!result) continue
        if (result.subcategories && s.subcategories) {
          walk(s.subcategories, result.subcategories)
        } else if (result.courses) {
          for (const c of result.courses) map[c.id] = s.label
        }
      }
    }
    walk(sections, evalSections)
    return map
  }
  $: courseAssignment = buildAssignmentMap(activeFramework.sections, evaluation.sections)

  /** Return the labels of every leaf section (incl. overlays) a course is eligible for. */
  function getEligibleSections(course, framework) {
    const result = []
    function walk(sections) {
      for (const s of sections) {
        if (s.elective) continue
        if (s.subcategories?.length) {
          walk(s.subcategories)
        } else if (!s.tags?.length || course.tags.some(t => s.tags.includes(t))) {
          result.push(s.label)
        }
      }
    }
    walk(framework.sections)
    return result
  }

  $: poolEligibility = Object.fromEntries(
    pool.map(c => [c.id, getEligibleSections(c, activeFramework)])
  )

  let planOpen = false
  let poolSearch = ''
  let poolFilterTags = null  // set when a requirement row is clicked

  // Label shown in the pool filter chip (first tag's label)
  $: poolFilterLabel = poolFilterTags
    ? (TAG_META[poolFilterTags[0]]?.label ?? poolFilterTags[0])
    : null

  function courseMatchesSearch(course, query) {
    const q = query.toLowerCase()
    if (course.title.toLowerCase().includes(q)) return true
    if (course.code.toLowerCase().includes(q)) return true
    return course.tags.some(t => {
      const meta = TAG_META[t]
      return meta && (
        meta.label.toLowerCase().includes(q) ||
        meta.short.toLowerCase().includes(q)
      )
    })
  }

  $: filteredPool = (() => {
    let result = pool
    if (poolFilterTags) {
      result = result.filter(c => c.tags.some(t => poolFilterTags.includes(t)))
    }
    if (poolSearch.trim()) {
      result = result.filter(c => courseMatchesSearch(c, poolSearch.trim()))
    }
    return result
  })()
  $: totalSections = activeFramework.sections?.length ?? 0
  $: satisfiedSections = Object.values(evaluation.sections).filter(s => s?.satisfied).length

  /** Add a course to the first semester with fewer than 12 credits */
  function addToFirstAvailable(course) {
    semesters.update(s => {
      const target = semesterLabels.find(label =>
        (s[label] ?? []).reduce((sum, c) => sum + c.credits, 0) < 12
      )
      if (target) {
        for (const key of Object.keys(s)) {
          s[key] = s[key].filter(c => c.id !== course.id)
        }
        s[target] = [...(s[target] ?? []), course]
      }
      return { ...s }
    })
  }
</script>

<div class="flex flex-col h-full overflow-hidden">

<header class="bg-odu-blue text-white px-6 py-3 flex items-center justify-between shadow shrink-0">
  <div>
    <h1 class="text-lg font-bold tracking-wide">ODU Gen Ed Dashboard</h1>
    <p class="text-xs text-blue-200">Faculty Simulation Tool</p>
  </div>
  <div class="flex items-center gap-3">
    <span class="text-xs text-blue-300">Catalog Year: 2027–2028</span>
    <button
      class="text-xs px-2 py-1 rounded border transition-colors {copyConfirmed ? 'border-green-400 text-green-300' : 'border-blue-400 text-blue-300 hover:border-blue-200 hover:text-blue-100'}"
      on:click={copyLink}
    >{copyConfirmed ? '✓ Copied' : 'Copy link'}</button>
  </div>
</header>

<FrameworkTabs
  frameworks={baseFrameworks}
  bind:activeIndex={activeFrameworkIndex}
  bind:editMode
  bind:compareMode
/>

<CreditSummaryBar framework={activeFramework} {evaluation} {placedCourses} />

<main class="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">

  <!-- Mobile: collapsible Plan dropdown -->
  <div class="md:hidden shrink-0 bg-white border-b border-gray-200">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      role="button"
      tabindex="0"
      class="px-4 py-2 flex items-center justify-between cursor-pointer select-none"
      on:click={() => planOpen = !planOpen}
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-semibold text-gray-700 truncate">Plan: {activeFramework.name}</span>
        <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium {evaluation.satisfied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">
          {satisfiedSections}/{totalSections} sections
        </span>
        {#if !evaluation.satisfied}
          <span class="shrink-0 text-xs text-gray-400 hidden sm:inline">· {placedCourses.length} courses placed</span>
        {/if}
      </div>
      <span class="ml-2 text-gray-400 text-xs">{planOpen ? '▲' : '▼'}</span>
    </div>
    {#if planOpen}
      <div class="border-t border-gray-100 overflow-y-auto max-h-56">
        {#if FrameworkEditor}
          <div class:hidden={!editMode}>
            <svelte:component this={FrameworkEditor}
              framework={baseFrameworks[activeFrameworkIndex]}
              onUpdate={handleFrameworkEdit}
            />
          </div>
        {/if}
        <div class:hidden={editMode}>
          <RequirementsTracker
            framework={activeFramework}
            {evaluation}
            activeFilterTags={poolFilterTags}
            onSelectTags={tags => { poolFilterTags = tags; poolSearch = '' }}
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- Desktop: left aside -->
  {#if compareMode}
    <aside class="hidden md:flex shrink-0 border-r border-gray-200 overflow-hidden bg-white" style="width: min(680px, 48%)">
      {#each baseFrameworks as fw, i}
        {@const fwEval = allEvaluations[i]}
        <div class="flex flex-col flex-1 min-w-0 overflow-hidden {i > 0 ? 'border-l border-gray-200' : ''}">
          <!-- Framework header -->
          <div class="px-3 py-2 border-b border-gray-100 shrink-0 flex items-center justify-between bg-gray-50">
            <span class="text-xs font-semibold text-odu-blue truncate">{fw.name}</span>
            {#if fwEval.satisfied}
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-300 shrink-0">DONE</span>
            {:else}
              {@const cr = Object.values(fwEval.sections).reduce((s, r) => s + (r?.creditsFulfilled ?? 0), 0)}
              {@const req = Object.values(fwEval.sections).reduce((s, r) => s + (r?.creditsRequired ?? 0), 0)}
              <span class="text-[10px] tabular-nums text-gray-400 shrink-0">{cr}/{req} cr</span>
            {/if}
          </div>
          <div class="overflow-y-auto flex-1">
            <RequirementsTracker
              framework={fw}
              evaluation={fwEval}
              activeFilterTags={poolFilterTags}
              onSelectTags={tags => { poolFilterTags = tags; poolSearch = '' }}
            />
          </div>
        </div>
      {/each}
    </aside>
  {:else}
    <aside class="hidden md:flex md:flex-col w-[360px] min-w-[280px] shrink-0 border-r border-gray-200 overflow-hidden bg-white">
      {#if FrameworkEditor}
        <div class="flex flex-col h-full" class:hidden={!editMode}>
          <svelte:component this={FrameworkEditor}
            framework={baseFrameworks[activeFrameworkIndex]}
            onUpdate={handleFrameworkEdit}
          />
        </div>
      {/if}
      <div class="overflow-y-auto flex-1" class:hidden={editMode}>
        <RequirementsTracker
          framework={activeFramework}
          {evaluation}
          activeFilterTags={poolFilterTags}
          onSelectTags={tags => { poolFilterTags = tags; poolSearch = '' }}
        />
      </div>
    </aside>
  {/if}

  <!-- Center + right on desktop / stacked on mobile -->
  <div class="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

    <!-- Semester Planner: top half on mobile, center on desktop -->
    <section class="@container flex-1 min-h-0 overflow-y-auto p-4 border-b md:border-b-0 border-gray-200">
      <SemesterPlanner {semesterLabels} {semesters} {courseAssignment} />
    </section>

    <!-- Course Pool: bottom half on mobile, right aside on desktop -->
    <aside class="flex-1 min-h-0 md:flex-none md:w-[380px] md:min-w-[300px] border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto bg-white flex flex-col">
      <div class="px-3 pt-4 pb-2 border-b border-gray-100 shrink-0">
        <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Course Pool</h2>
        <p class="text-[10px] text-gray-400 mt-0.5">Click to place · drag to semester</p>
        <div class="relative mt-2">
          <input
            type="search"
            bind:value={poolSearch}
            placeholder="Search title or tag…"
            class="w-full text-xs rounded border border-gray-200 bg-gray-50 px-2 py-1 pr-6 placeholder-gray-300 focus:outline-none focus:border-odu-lightblue focus:bg-white"
          />
          {#if poolSearch}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span
              role="button"
              tabindex="0"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-pointer text-sm leading-none"
              on:click={() => poolSearch = ''}
            >✕</span>
          {/if}
        </div>
        {#if poolFilterLabel}
          <div class="mt-1.5 flex items-center gap-1">
            <span class="text-[10px] text-odu-lightblue font-medium">Showing:</span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span
              role="button"
              tabindex="0"
              class="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 text-blue-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue-100"
              on:click={() => poolFilterTags = null}
            >
              {poolFilterLabel} <span class="text-blue-400">✕</span>
            </span>
          </div>
        {/if}
      </div>
      <div class="grid grid-cols-2 gap-2 p-3 content-start">
        {#each filteredPool as course (course.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div role="button" tabindex="0" on:click={() => addToFirstAvailable(course)}>
            <CourseCard
              {course}
              eligibleFor={poolEligibility[course.id]}
              onDragStart={e => e.dataTransfer.setData('text/plain', course.id)}
            />
          </div>
        {/each}
        {#if filteredPool.length === 0}
          <p class="text-gray-400 text-xs italic text-center col-span-2 mt-4">
            {pool.length === 0 ? 'All courses placed.' : 'No matches.'}
          </p>
        {/if}
      </div>
    </aside>

  </div>
</main>

</div>
