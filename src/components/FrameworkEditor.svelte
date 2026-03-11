<script>
  import { dump, load } from 'js-yaml'

  export let framework        // current framework object
  export let onUpdate = null  // called with new framework object when YAML is valid

  let yamlText = ''
  let error = null
  let debounceTimer = null
  let originalYaml = ''
  let loadedFrameworkId = null

  // Reset only when the active framework actually changes (not on every reactive run)
  $: if (framework?.id !== loadedFrameworkId) {
    loadedFrameworkId = framework?.id
    originalYaml = dump(framework, { lineWidth: 80, quotingType: '"' })
    yamlText = originalYaml
    error = null
  }

  function handleInput() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(parse, 300)
  }

  function parse() {
    try {
      const parsed = load(yamlText)
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid framework structure')
      if (!parsed.sections || !Array.isArray(parsed.sections)) throw new Error('Framework must have a sections array')
      error = null
      onUpdate?.(parsed)
    } catch (e) {
      error = e.message
    }
  }

  function reset() {
    yamlText = originalYaml
    error = null
    try {
      onUpdate?.(load(originalYaml))
    } catch (_) {}
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0 flex items-center justify-between">
    <div>
      <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edit Framework</h2>
      <p class="text-[10px] text-gray-400 mt-0.5">Changes apply live · refresh to reset</p>
    </div>
    <button
      class="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
      on:click={reset}
    >Reset</button>
  </div>

  <!-- Status bar -->
  <div class="px-4 py-1.5 shrink-0 border-b border-gray-100 text-[10px] font-medium {error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
    {#if error}
      ✕ {error}
    {:else}
      ✓ Valid
    {/if}
  </div>

  <!-- YAML textarea -->
  <textarea
    class="flex-1 font-mono text-xs p-3 resize-none outline-none border-0 bg-gray-50 text-gray-800 leading-relaxed"
    spellcheck="false"
    bind:value={yamlText}
    on:input={handleInput}
  ></textarea>
</div>
