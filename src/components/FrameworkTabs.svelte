<script>
  export let frameworks
  export let activeIndex
  export let editMode = false
  export let compareMode = false
</script>

<nav class="bg-white border-b border-gray-200 px-6 flex items-end justify-between pt-1 shrink-0">
  <div class="flex gap-1">
    {#each frameworks as fw, i}
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        class:border-odu-blue={activeIndex === i && !compareMode}
        class:text-odu-blue={activeIndex === i && !compareMode}
        class:border-transparent={activeIndex !== i || compareMode}
        class:text-gray-500={activeIndex !== i || compareMode}
        class:hover:text-gray-700={activeIndex !== i || compareMode}
        on:click={() => { activeIndex = i; compareMode = false }}
      >
        {fw.name}
      </button>
    {/each}
  </div>

  <div class="flex items-center gap-2 mb-1">
    <button
      class="px-3 py-1 text-xs font-medium rounded border transition-colors"
      class:bg-odu-blue={compareMode}
      class:text-white={compareMode}
      class:border-odu-blue={compareMode}
      class:border-gray-200={!compareMode}
      class:text-gray-500={!compareMode}
      class:hover:border-gray-400={!compareMode}
      on:click={() => { compareMode = !compareMode; if (compareMode) editMode = false }}
    >
      Compare
    </button>
    <button
      class="px-3 py-1 text-xs font-medium rounded border transition-colors"
      class:bg-odu-blue={editMode}
      class:text-white={editMode}
      class:border-odu-blue={editMode}
      class:border-gray-200={!editMode}
      class:text-gray-500={!editMode}
      class:hover:border-gray-400={!editMode}
      disabled={compareMode}
      on:click={() => editMode = !editMode}
    >
      {editMode ? 'Done Editing' : 'Edit Framework'}
    </button>
  </div>
</nav>
