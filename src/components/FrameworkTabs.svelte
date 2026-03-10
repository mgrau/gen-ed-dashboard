<script>
  export let frameworks
  export let activeIndex
</script>

<nav class="bg-white border-b border-gray-200 px-6 flex gap-1 pt-1">
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
</nav>
