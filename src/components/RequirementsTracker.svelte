<script>
  export let framework
  export let evaluation
  export let activeFilterTags = null
  export let onSelectTags = () => {}

  function statusIcon(satisfied) {
    return satisfied ? '✓' : '○'
  }

  function tagsMatch(a, b) {
    if (!a || !b || a.length !== b.length) return false
    const as = [...a].sort(), bs = [...b].sort()
    return as.every((t, i) => t === bs[i])
  }

  function handleSelect(tags) {
    if (!tags?.length) return
    onSelectTags(tagsMatch(activeFilterTags, tags) ? null : tags)
  }

  function pct(fulfilled, required) {
    return Math.min(100, required > 0 ? (fulfilled / required) * 100 : 0)
  }
</script>

<div class="p-4">
  <div class="flex items-center gap-3 mb-1">
    <h2 class="text-base font-bold text-gray-800">{framework.name}</h2>
    {#if evaluation.satisfied}
      <span class="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-300">COMPLETE</span>
    {:else}
      <span class="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-600 border border-red-300">INCOMPLETE</span>
    {/if}
  </div>
  {#if framework.description}
    <p class="text-xs text-gray-500 mb-4 leading-relaxed">{framework.description}</p>
  {/if}

  {#each framework.sections as section}
    {@const result = evaluation.sections[section.id]}
    {@const sectionTags = section.course_tags ?? null}
    {@const sectionActive = tagsMatch(activeFilterTags, sectionTags)}
    <div class="mb-4">

      <!-- Section header -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        role="button"
        tabindex="0"
        class="req-row font-semibold text-gray-700 bg-gray-50 -mx-4 px-4 rounded-sm"
        class:cursor-pointer={!!sectionTags}
        class:hover:bg-blue-50={!!sectionTags}
        class:bg-blue-50={sectionActive}
        on:click={() => handleSelect(sectionTags)}
      >
        <span class={result?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
          {statusIcon(result?.satisfied)}
        </span>
        <span class="flex-1">{section.label}</span>
        <!-- Progress bar + credits -->
        <div class="flex items-center gap-1.5 shrink-0">
          <div class="w-12 h-1 rounded-full bg-gray-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all {result?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
              style="width: {pct(result?.creditsFulfilled ?? 0, section.credits_required)}%"
            ></div>
          </div>
          <span class="text-xs tabular-nums {result?.satisfied ? 'text-gray-400' : 'text-red-400'}">
            {result?.creditsFulfilled ?? 0}/{section.credits_required} cr
          </span>
        </div>
      </div>

      {#if section.type === 'group' && result?.subsections}
        {#each section.subsections as sub}
          {@const subResult = result.subsections[sub.id]}
          {@const subActive = tagsMatch(activeFilterTags, sub.course_tags)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            role="button"
            tabindex="0"
            class="req-row pl-6 text-gray-600 cursor-pointer hover:bg-blue-50 rounded-sm"
            class:bg-blue-50={subActive}
            on:click={() => handleSelect(sub.course_tags)}
          >
            <span class={subResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(subResult?.satisfied)}
            </span>
            <span class="flex-1">{sub.label}</span>
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="w-10 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all {subResult?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                  style="width: {pct(subResult?.creditsFulfilled ?? 0, sub.credits_required)}%"
                ></div>
              </div>
              <span class="text-xs tabular-nums {subResult?.satisfied ? 'text-gray-400' : 'text-red-400'}">
                {subResult?.creditsFulfilled ?? 0}/{sub.credits_required} cr
              </span>
            </div>
          </div>
          {#each subResult?.courses ?? [] as course}
            <div class="req-row pl-10 text-gray-500 text-xs">
              <span class="w-3"></span>
              <span class="w-24 font-mono text-gray-600">{course.code}</span>
              <span class="flex-1">{course.title}</span>
              <span class="tabular-nums text-gray-400">{course.credits} cr</span>
            </div>
          {/each}
        {/each}

      {:else if section.type === 'goals' && result?.goals}
        <!-- Goals note -->
        <div class="req-row pl-4 text-xs text-gray-500 italic">
          <span class="w-3"></span>
          <span>{section.note}</span>
        </div>
        {#each framework.sections.find(s => s.id === section.id).goals as goal}
          {@const goalResult = result.goals[goal.id]}
          {@const goalTags = [goal.tag]}
          {@const goalActive = tagsMatch(activeFilterTags, goalTags)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            role="button"
            tabindex="0"
            class="req-row pl-6 text-gray-600 cursor-pointer hover:bg-blue-50 rounded-sm"
            class:bg-blue-50={goalActive}
            on:click={() => handleSelect(goalTags)}
          >
            <span class={goalResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(goalResult?.satisfied)}
            </span>
            <span class="flex-1">{goal.label}</span>
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="w-10 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all {goalResult?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                  style="width: {pct(goalResult?.creditsFulfilled ?? 0, goal.credits_required)}%"
                ></div>
              </div>
              <span class="text-xs tabular-nums {goalResult?.satisfied ? 'text-gray-400' : 'text-red-400'}">
                {goalResult?.creditsFulfilled ?? 0}/{goal.credits_required} cr
              </span>
            </div>
          </div>
          {#each goalResult?.courses ?? [] as course}
            <div class="req-row pl-10 text-gray-500 text-xs">
              <span class="w-3"></span>
              <span class="w-24 font-mono text-gray-600">{course.code}</span>
              <span class="flex-1">{course.title}</span>
              <span class="tabular-nums text-gray-400">{course.credits} cr</span>
            </div>
          {/each}
        {/each}

        <!-- Breadth -->
        <div class="req-row pl-4 mt-1 font-medium text-gray-600">
          <span class="w-3"></span>
          <span>Disciplinary Breadth</span>
        </div>
        {#each framework.sections.find(s => s.id === section.id).breadth as b}
          {@const bResult = result.breadth[b.id]}
          {@const bTags = [b.tag]}
          {@const bActive = tagsMatch(activeFilterTags, bTags)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            role="button"
            tabindex="0"
            class="req-row pl-6 text-gray-600 cursor-pointer hover:bg-blue-50 rounded-sm"
            class:bg-blue-50={bActive}
            on:click={() => handleSelect(bTags)}
          >
            <span class={bResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(bResult?.satisfied)}
            </span>
            <span class="flex-1">{b.label}</span>
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="w-10 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all {bResult?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                  style="width: {pct(bResult?.creditsFulfilled ?? 0, b.credits_required)}%"
                ></div>
              </div>
              <span class="text-xs tabular-nums {bResult?.satisfied ? 'text-gray-400' : 'text-red-400'}">
                {bResult?.creditsFulfilled ?? 0}/{b.credits_required} cr
              </span>
            </div>
          </div>
          {#each bResult?.courses ?? [] as course}
            <div class="req-row pl-10 text-gray-500 text-xs">
              <span class="w-3"></span>
              <span class="w-24 font-mono text-gray-600">{course.code}</span>
              <span class="flex-1">{course.title}</span>
              <span class="tabular-nums text-gray-400">{course.credits} cr</span>
            </div>
          {/each}
        {/each}

      {:else}
        <!-- Fixed / Elective -->
        {#each result?.courses ?? [] as course}
          <div class="req-row pl-10 text-gray-500 text-xs">
            <span class="w-3"></span>
            <span class="w-24 font-mono text-gray-600">{course.code}</span>
            <span class="flex-1">{course.title}</span>
            <span class="tabular-nums text-gray-400">{course.credits} cr</span>
          </div>
        {/each}
        {#if section.note}
          <div class="req-row pl-6 text-xs text-gray-400 italic">
            <span class="w-3"></span>
            <span>{section.note}</span>
          </div>
        {/if}
      {/if}

    </div>
  {/each}
</div>
