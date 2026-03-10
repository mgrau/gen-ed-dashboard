<script>
  import { writable } from 'svelte/store'
  import frameworkA from '../data/frameworks/framework-a.yaml'
  import allCourses from '../data/courses.yaml'
  import FrameworkTabs from './components/FrameworkTabs.svelte'
  import RequirementsTracker from './components/RequirementsTracker.svelte'
  import SemesterPlanner from './components/SemesterPlanner.svelte'
  import CourseCard from './components/CourseCard.svelte'
  import { evaluate } from './lib/engine.js'

  const frameworks = [frameworkA]
  let activeFrameworkIndex = 0
  $: activeFramework = frameworks[activeFrameworkIndex]

  const semesterLabels = [
    'Fall Year 1', 'Spring Year 1',
    'Fall Year 2', 'Spring Year 2',
    'Fall Year 3', 'Spring Year 3',
    'Fall Year 4', 'Spring Year 4'
  ]

  const semesters = writable(
    Object.fromEntries(semesterLabels.map(label => [label, []]))
  )

  $: placedCourses = Object.values($semesters).flat()
  $: placedIds = new Set(placedCourses.map(c => c.id))
  $: pool = allCourses.courses.filter(c => !placedIds.has(c.id))
  $: evaluation = evaluate(activeFramework, placedCourses)

  let planOpen = false
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

<header class="bg-odu-blue text-white px-6 py-3 flex items-center justify-between shadow">
  <div>
    <h1 class="text-lg font-bold tracking-wide">ODU Gen Ed Dashboard</h1>
    <p class="text-xs text-blue-200">Faculty Simulation Tool</p>
  </div>
  <span class="text-xs text-blue-300">Catalog Year: 2027–2028</span>
</header>

<FrameworkTabs {frameworks} bind:activeIndex={activeFrameworkIndex} />

<main class="flex flex-col md:flex-row overflow-hidden" style="height: calc(100vh - 96px)">

  <!-- Mobile: collapsible Plan dropdown -->
  <div class="md:hidden shrink-0 bg-white border-b border-gray-200">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
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
        <RequirementsTracker framework={activeFramework} {evaluation} />
      </div>
    {/if}
  </div>

  <!-- Desktop: left aside -->
  <aside class="hidden md:block w-[360px] min-w-[280px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
    <RequirementsTracker framework={activeFramework} {evaluation} />
  </aside>

  <!-- Center + right on desktop / stacked on mobile -->
  <div class="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

    <!-- Semester Planner: top half on mobile, center on desktop -->
    <section class="flex-1 min-h-0 overflow-y-auto p-4 border-b md:border-b-0 border-gray-200">
      <SemesterPlanner {semesterLabels} {semesters} {addToFirstAvailable} />
    </section>

    <!-- Course Pool: bottom half on mobile, right aside on desktop -->
    <aside class="flex-1 min-h-0 md:flex-none md:w-[380px] md:min-w-[300px] border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto bg-white flex flex-col">
      <div class="px-3 pt-4 pb-2 border-b border-gray-100 shrink-0">
        <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Course Pool</h2>
        <p class="text-[10px] text-gray-400 mt-0.5">Click to place · drag to semester</p>
      </div>
      <div class="grid grid-cols-2 gap-2 p-3 content-start">
        {#each pool as course (course.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div on:click={() => addToFirstAvailable(course)}>
            <CourseCard
              {course}
              onDragStart={e => e.dataTransfer.setData('text/plain', course.id)}
            />
          </div>
        {/each}
        {#if pool.length === 0}
          <p class="text-gray-400 text-xs italic text-center col-span-2 mt-4">All courses placed.</p>
        {/if}
      </div>
    </aside>

  </div>
</main>
