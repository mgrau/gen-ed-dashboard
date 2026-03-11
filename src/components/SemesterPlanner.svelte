<script>
  import allCourses from '../../data/courses.yaml'
  import CourseCard from './CourseCard.svelte'

  export let semesterLabels
  export let semesters  // writable store: { label: [courses] }

  const courseMap = Object.fromEntries(allCourses.courses.map(c => [c.id, c]))

  function onDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-odu-lightblue')
  }

  function onDragLeave(e) {
    e.currentTarget.classList.remove('ring-2', 'ring-odu-lightblue')
  }

  function onDrop(e, semesterLabel) {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-odu-lightblue')
    const courseId = e.dataTransfer.getData('text/plain')
    const course = courseMap[courseId]
    if (!course) return

    semesters.update(s => {
      for (const key of Object.keys(s)) {
        s[key] = s[key].filter(c => c.id !== courseId)
      }
      s[semesterLabel] = [...(s[semesterLabel] || []), course]
      return { ...s }
    })
  }

  function removeCourse(semesterLabel, courseId) {
    semesters.update(s => {
      s[semesterLabel] = s[semesterLabel].filter(c => c.id !== courseId)
      return { ...s }
    })
  }
</script>

<div>
  <h2 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Semester Planner</h2>
  <div class="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-4">
    {#each semesterLabels as label}
      {@const courses = $semesters[label] ?? []}
      {@const credits = courses.reduce((s, c) => s + c.credits, 0)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="semester-col transition-all"
        class:bg-red-50={credits > 15 && credits <= 18}
        class:bg-red-100={credits > 18}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={e => onDrop(e, label)}
      >
        <div class="flex justify-between items-baseline mb-1">
          <h3 class="text-xs font-semibold text-odu-blue">{label}</h3>
          <span class="text-xs text-gray-400">{credits} cr</span>
        </div>

        {#each courses as course (course.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div on:click={() => removeCourse(label, course.id)}>
            <CourseCard
              {course}
              onDragStart={e => e.dataTransfer.setData('text/plain', course.id)}
            />
          </div>
        {/each}

        {#if courses.length === 0}
          <p class="text-gray-300 text-xs italic text-center mt-4">Drop courses here</p>
        {/if}
      </div>
    {/each}
  </div>
</div>
