<script>
  export let framework
  export let evaluation

  function statusIcon(satisfied) {
    return satisfied ? '✓' : '○'
  }

  function creditLabel(fulfilled, required) {
    return `${fulfilled}/${required} cr`
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
    <div class="mb-4">
      <!-- Section header -->
      <div class="req-row font-semibold text-gray-700 bg-gray-50 -mx-4 px-4">
        <span class={result?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
          {statusIcon(result?.satisfied)}
        </span>
        <span class="flex-1">{section.label}</span>
        <span class="text-xs text-gray-400 tabular-nums">
          {creditLabel(result?.creditsFulfilled ?? 0, section.credits_required)}
        </span>
      </div>

      {#if section.type === 'group' && result?.subsections}
        {#each section.subsections as sub}
          {@const subResult = result.subsections[sub.id]}
          <div class="req-row pl-6 text-gray-600">
            <span class={subResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(subResult?.satisfied)}
            </span>
            <span class="flex-1">{sub.label}</span>
            {#if subResult?.satisfied}
              <span class="text-xs text-gray-400 tabular-nums">
                {creditLabel(subResult.creditsFulfilled, sub.credits_required)}
              </span>
            {:else}
              <span class="text-xs text-red-400 italic">Still needed</span>
            {/if}
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
        <!-- Goals -->
        <div class="req-row pl-4 text-xs text-gray-500 italic">
          <span class="w-3"></span>
          <span>{section.note}</span>
        </div>
        {#each framework.sections.find(s => s.id === section.id).goals as goal}
          {@const goalResult = result.goals[goal.id]}
          <div class="req-row pl-6 text-gray-600">
            <span class={goalResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(goalResult?.satisfied)}
            </span>
            <span class="flex-1">{goal.label}</span>
            {#if goalResult?.satisfied}
              <span class="text-xs text-gray-400 tabular-nums">
                {creditLabel(goalResult.creditsFulfilled, goal.credits_required)}
              </span>
            {:else}
              <span class="text-xs text-red-400 italic">Still needed</span>
            {/if}
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
          <div class="req-row pl-6 text-gray-600">
            <span class={bResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
              {statusIcon(bResult?.satisfied)}
            </span>
            <span class="flex-1">{b.label}</span>
            {#if bResult?.satisfied}
              <span class="text-xs text-gray-400 tabular-nums">
                {creditLabel(bResult.creditsFulfilled, b.credits_required)}
              </span>
            {:else}
              <span class="text-xs text-red-400 italic">Still needed</span>
            {/if}
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
        {#if !(result?.satisfied)}
          <div class="req-row pl-6 text-xs text-red-400 italic">
            <span class="w-3"></span>
            <span>Still needed: {section.credits_required - (result?.creditsFulfilled ?? 0)} more credits</span>
          </div>
        {/if}
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
