<script>
  import { TAG_META, fulfillableLabels } from '../lib/tags.js'

  export let course
  export let onDragStart = null
  export let onRemove = null   // if set, show remove button

  let showTooltip = false

  $: visibleTags = course.tags.filter(t => TAG_META[t])
  $: fulfillable = fulfillableLabels(course)
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
      class="absolute top-1 right-1 text-gray-300 hover:text-red-400 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
      on:click={onRemove}
      title="Remove"
      tabindex="-1"
    >✕</button>
  {/if}

  <p class="font-semibold text-odu-blue text-xs">{course.code}</p>
  <p class="text-gray-600 leading-tight text-xs pr-3">{course.title}</p>

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

  <p class="text-gray-400 text-[10px] mt-1">{course.credits} cr</p>

  <!-- Hover tooltip -->
  {#if showTooltip && fulfillable.length > 0}
    <div class="absolute z-50 bottom-full left-0 mb-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs pointer-events-none">
      <p class="font-semibold text-gray-700 mb-1">{course.code} — {course.title}</p>
      <p class="text-gray-500 mb-1">{course.credits} credits</p>
      <p class="font-medium text-gray-600">Can fulfill:</p>
      <ul class="mt-0.5 space-y-0.5">
        {#each fulfillable as label}
          <li class="text-gray-500">• {label}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
