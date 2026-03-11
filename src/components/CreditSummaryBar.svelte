<script>
  export let framework
  export let evaluation
  export let placedCourses

  $: placedCredits = placedCourses.reduce((sum, c) => sum + (c.credits || 0), 0)
  $: requiredCredits = framework.sections.reduce((sum, s) => {
    const r = evaluation.sections[s.id]
    return sum + (r?.creditsRequired ?? 0)
  }, 0)
  $: pct = requiredCredits > 0 ? Math.min(100, (placedCredits / requiredCredits) * 100) : 0
  $: allDone = evaluation.satisfied
</script>

<div class="hidden md:flex bg-white border-b border-gray-200 px-4 py-2 items-center gap-4 shrink-0">

  <!-- Progress bar + credit count -->
  <div class="flex items-center gap-2 shrink-0">
    <div class="w-28 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300 {allDone ? 'bg-green-400' : 'bg-odu-lightblue'}"
        style="width: {pct}%"
      ></div>
    </div>
    <span class="text-xs tabular-nums font-medium {allDone ? 'text-green-600' : 'text-gray-600'}">
      {placedCredits}<span class="text-gray-400 font-normal">/{requiredCredits} cr</span>
    </span>
  </div>

  <!-- Divider -->
  <div class="h-4 w-px bg-gray-200 shrink-0"></div>

  <!-- Per-section indicators -->
  <div class="flex items-center gap-3 overflow-x-auto min-w-0">
    {#each framework.sections as section}
      {@const result = evaluation.sections[section.id]}
      {@const done = result?.satisfied}
      <div class="flex items-center gap-1 shrink-0">
        <span class="text-[10px] leading-none {done ? 'text-green-500' : 'text-gray-300'}">{done ? '●' : '○'}</span>
        <span class="text-[11px] {done ? 'text-gray-500' : 'text-gray-400'} whitespace-nowrap">{section.label}</span>
      </div>
    {/each}
  </div>

</div>
