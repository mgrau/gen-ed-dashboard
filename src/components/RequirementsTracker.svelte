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

  function creditLabel(result) {
    if (!result?.creditsRequired) return `${result?.creditsFulfilled ?? 0} cr`
    return `${result.creditsFulfilled}/${result.creditsRequired} cr`
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
    {@const sectionActive = tagsMatch(activeFilterTags, section.tags)}

    <div class="mb-4">

      <!-- Section header -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        role="button"
        tabindex="0"
        class="req-row font-semibold text-gray-700 bg-gray-50 -mx-4 px-4 rounded-sm"
        class:cursor-pointer={!!section.tags?.length}
        class:hover:bg-blue-50={!!section.tags?.length}
        class:bg-blue-50={sectionActive}
        on:click={() => handleSelect(section.tags)}
      >
        <span class={result?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
          {statusIcon(result?.satisfied)}
        </span>
        <span class="flex-1">{section.label}</span>
        {#if result?.creditsRequired}
          <div class="flex items-center gap-1.5 shrink-0">
            <div class="w-12 h-1 rounded-full bg-gray-200 overflow-hidden">
              <div
                class="h-full rounded-full transition-all {result?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                style="width: {pct(result?.creditsFulfilled ?? 0, result?.creditsRequired)}%"
              ></div>
            </div>
            <span class="text-xs tabular-nums {result?.satisfied ? 'text-gray-400' : 'text-red-400'}">
              {creditLabel(result)}
            </span>
          </div>
        {/if}
      </div>

      {#if section.note && !result?.subcategories}
        <div class="req-row pl-4 text-xs text-gray-500 italic">
          <span class="w-3"></span>
          <span>{section.note}</span>
        </div>
      {/if}

      <!-- Subcategories -->
      {#if result?.subcategories}
        {#if section.note}
          <div class="req-row pl-4 text-xs text-gray-500 italic">
            <span class="w-3"></span>
            <span>{section.note}</span>
          </div>
        {/if}

        {#each section.subcategories as sub}
          {@const subResult = result.subcategories[sub.id]}

          {#if sub.overlay}
            <!-- ── Overlay group ── -->
            <!-- Header: visual divider with satisfied indicator -->
            <div class="req-row pl-4 mt-2 text-xs font-medium text-gray-500 border-t border-dashed border-gray-200 pt-2">
              <span class={subResult?.satisfied ? 'req-satisfied' : 'req-incomplete'} style="font-size:0.65rem">
                {statusIcon(subResult?.satisfied)}
              </span>
              <span class="flex-1 italic">{sub.label}</span>
              <span class="text-[10px] text-gray-400 font-normal normal-case">from goal courses</span>
            </div>

            <!-- Overlay children -->
            {#if sub.subcategories && subResult?.subcategories}
              {#each sub.subcategories as overlaySub}
                {@const overlayResult = subResult.subcategories[overlaySub.id]}
                {@const overlayActive = tagsMatch(activeFilterTags, overlaySub.tags)}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                  role="button"
                  tabindex="0"
                  class="req-row pl-8 text-gray-600 cursor-pointer hover:bg-blue-50 rounded-sm"
                  class:bg-blue-50={overlayActive}
                  on:click={() => handleSelect(overlaySub.tags)}
                >
                  <span class={overlayResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
                    {statusIcon(overlayResult?.satisfied)}
                  </span>
                  <span class="flex-1">{overlaySub.label}</span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <div class="w-10 h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all {overlayResult?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                        style="width: {pct(overlayResult?.creditsFulfilled ?? 0, overlayResult?.creditsRequired)}%"
                      ></div>
                    </div>
                    <span class="text-xs tabular-nums {overlayResult?.satisfied ? 'text-gray-400' : 'text-red-400'}">
                      {creditLabel(overlayResult ?? { creditsFulfilled: 0, creditsRequired: overlaySub.min_credits ?? 0 })}
                    </span>
                  </div>
                </div>
                {#each overlayResult?.courses ?? [] as course}
                  <div class="req-row pl-12 text-gray-500 text-xs">
                    <span class="w-3"></span>
                    <span class="w-24 font-mono text-gray-600">{course.code}</span>
                    <span class="flex-1">{course.title}</span>
                    <span class="tabular-nums text-gray-400">{course.credits} cr</span>
                  </div>
                {/each}
              {/each}
            {/if}

          {:else}
            <!-- ── Allocating subcategory ── -->
            {@const subActive = tagsMatch(activeFilterTags, sub.tags)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              role="button"
              tabindex="0"
              class="req-row pl-6 text-gray-600 cursor-pointer hover:bg-blue-50 rounded-sm"
              class:bg-blue-50={subActive}
              on:click={() => handleSelect(sub.tags)}
            >
              <span class={subResult?.satisfied ? 'req-satisfied' : 'req-incomplete'}>
                {statusIcon(subResult?.satisfied)}
              </span>
              <span class="flex-1">{sub.label}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <div class="w-10 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all {subResult?.satisfied ? 'bg-green-400' : 'bg-red-300'}"
                    style="width: {pct(subResult?.creditsFulfilled ?? 0, subResult?.creditsRequired)}%"
                  ></div>
                </div>
                <span class="text-xs tabular-nums {subResult?.satisfied ? 'text-gray-400' : 'text-red-400'}">
                  {creditLabel(subResult ?? { creditsFulfilled: 0, creditsRequired: sub.min_credits ?? sub.credits ?? 0 })}
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
          {/if}

        {/each}

      {:else}
        <!-- Leaf or elective: show assigned courses -->
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
