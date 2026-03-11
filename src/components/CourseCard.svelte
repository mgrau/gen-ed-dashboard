<script>
  import { TAG_META, fulfillableLabels } from '../lib/tags.js'

  export let course
  export let onDragStart = null
  export let onRemove = null   // if set, show remove button
  export let assignedTo = null   // label of the requirement this course satisfies (planner)
  export let eligibleFor = null  // framework-aware list of sections this course can fill (pool)

  let showTooltip = false

  $: visibleTags = course.tags.filter(t => TAG_META[t])
  $: tooltipItems = eligibleFor ?? fulfillableLabels(course)
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="course-card group relative border"
  class:cursor-grab={!!onDragStart}
  draggable={!!onDragStart}
  role="listitem"
  on:dragstart={onDragStart}
  on:mouseenter={() => showTooltip = true}
  on:mouseleave={() => showTooltip = false}
  on:focus={() => showTooltip = true}
  on:blur={() => showTooltip = false}
>
  {#if onRemove}
    <button
      class="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-white/60 rounded text-red-400 text-sm"
      on:click={onRemove}
      title="Remove"
      tabindex="-1"
    >✕</button>
  {/if}

  <div class="flex items-start justify-between gap-1">
    <p class="font-semibold text-odu-blue text-xs">{course.code}</p>
    <span class="text-[10px] text-gray-400 tabular-nums shrink-0">{course.credits} cr</span>
  </div>
  <p class="text-gray-600 leading-tight text-xs">{course.title}</p>

  <!-- Assignment label -->
  {#if assignedTo}
    <p class="text-[10px] text-gray-400 mt-1 truncate" title={assignedTo}>→ {assignedTo}</p>
  {/if}

  <!-- Goal / type tags -->
  {#if visibleTags.length > 0}
    <div class="flex flex-wrap gap-1 mt-1.5">
      {#each visibleTags as tag}
        <span class="text-[10px] px-1.5 py-0.5 rounded border font-medium {TAG_META[tag].color}">
          {TAG_META[tag].short}
        </span>
      {/each}
    </div>
  {/if}

  <!-- Hover tooltip -->
  {#if showTooltip && tooltipItems.length > 0}
    <div class="absolute z-50 bottom-full left-0 mb-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs pointer-events-none">
      <p class="font-semibold text-gray-700 mb-1">{course.code} — {course.title}</p>
      <p class="text-gray-500 mb-1">{course.credits} credits</p>
      <p class="font-medium text-gray-600">{eligibleFor ? 'Can satisfy:' : 'Can fulfill:'}</p>
      <ul class="mt-0.5 space-y-0.5">
        {#each tooltipItems as label}
          <li class="text-gray-500">• {label}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
