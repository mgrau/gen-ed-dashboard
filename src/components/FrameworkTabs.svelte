<script>
  export let frameworks
  export let activeIndex
  export let editMode = false
</script>

<nav class="bg-white border-b border-gray-200 px-6 flex items-end justify-between pt-1">
  <div class="flex gap-1">
    {#each frameworks as fw, i}
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        class:border-odu-blue={activeIndex === i}
        class:text-odu-blue={activeIndex === i}
        class:border-transparent={activeIndex !== i}
        class:text-gray-500={activeIndex !== i}
        class:hover:text-gray-700={activeIndex !== i}
        on:click={() => activeIndex = i}
      >
        {fw.name}
      </button>
    {/each}
  </div>

  <button
    class="mb-1 px-3 py-1 text-xs font-medium rounded border transition-colors"
    class:bg-odu-blue={editMode}
    class:text-white={editMode}
    class:border-odu-blue={editMode}
    class:border-gray-200={!editMode}
    class:text-gray-500={!editMode}
    class:hover:border-gray-400={!editMode}
    on:click={() => editMode = !editMode}
  >
    {editMode ? 'Done Editing' : 'Edit Framework'}
  </button>
</nav>
