<script>
  import { dump, load } from 'js-yaml'
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, keymap, MatchDecorator, ViewPlugin, Decoration } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { yaml } from '@codemirror/lang-yaml'
  import { basicSetup } from 'codemirror'
  import { indentWithTab } from '@codemirror/commands'

  // ── Custom token highlighting ──────────────────────────────────────────────

  function makeHighlighter(regexp, getClass) {
    const deco = new MatchDecorator({
      regexp,
      decoration: m => Decoration.mark({ class: getClass(m) })
    })
    return ViewPlugin.fromClass(
      class {
        constructor(view) { this.decorations = deco.createDeco(view) }
        update(update)   { this.decorations = deco.updateDeco(update, this.decorations) }
      },
      { decorations: v => v.decorations }
    )
  }

  // Tag values — match the color palette from tags.js
  const tagHighlighter = makeHighlighter(
    /\b(goal_inquiry|goal_reasoning|goal_communication|goal_civic|natural_science|arts|humanities|social_science|fys|composition|math_foundational|gened_capstone)\b/g,
    m => `cm-fw-tag-${m[1].replace(/_/g, '-')}`
  )

  // Schema property keys (word before a colon)
  const keyHighlighter = makeHighlighter(
    /\b(id|label|name|description|tags|credits|min_credits|max_credits|courses|min_courses|max_courses|subcategories|overlay|elective|sections|note)\b(?=\s*:)/g,
    () => 'cm-fw-key'
  )

  const customTheme = EditorView.baseTheme({
    // Schema keys
    '.cm-fw-key': { color: '#003057', fontWeight: '600' },
    // Goal tags
    '.cm-fw-tag-goal-inquiry':       { color: '#1d4ed8', fontWeight: '600' },
    '.cm-fw-tag-goal-reasoning':     { color: '#b45309', fontWeight: '600' },
    '.cm-fw-tag-goal-communication': { color: '#15803d', fontWeight: '600' },
    '.cm-fw-tag-goal-civic':         { color: '#7e22ce', fontWeight: '600' },
    // Breadth tags
    '.cm-fw-tag-natural-science':    { color: '#0f766e', fontWeight: '600' },
    '.cm-fw-tag-arts':               { color: '#be185d', fontWeight: '600' },
    '.cm-fw-tag-humanities':         { color: '#be123c', fontWeight: '600' },
    '.cm-fw-tag-social-science':     { color: '#c2410c', fontWeight: '600' },
    // Foundational/special tags
    '.cm-fw-tag-fys':                { color: '#475569', fontWeight: '600' },
    '.cm-fw-tag-composition':        { color: '#4338ca', fontWeight: '600' },
    '.cm-fw-tag-math-foundational':  { color: '#0e7490', fontWeight: '600' },
    '.cm-fw-tag-gened-capstone':     { color: '#4b5563', fontWeight: '600' },
  })

  export let framework
  export let onUpdate = null

  let error = null
  let originalYaml = ''
  let loadedFrameworkId = null
  let editorEl
  let view
  let debounceTimer = null

  // When the active framework changes, reload the editor content
  $: if (framework?.id !== loadedFrameworkId && view) {
    loadedFrameworkId = framework?.id
    originalYaml = dump(framework, { lineWidth: 80, quotingType: '"' })
    error = null
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: originalYaml }
    })
  }

  function parse(content) {
    try {
      const parsed = load(content)
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid framework structure')
      if (!parsed.sections || !Array.isArray(parsed.sections)) throw new Error('Framework must have a sections array')
      error = null
      onUpdate?.(parsed)
    } catch (e) {
      error = e.message
    }
  }

  onMount(() => {
    loadedFrameworkId = framework?.id
    originalYaml = dump(framework, { lineWidth: 80, quotingType: '"' })

    view = new EditorView({
      state: EditorState.create({
        doc: originalYaml,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          yaml(),
          tagHighlighter,
          keyHighlighter,
          customTheme,
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => parse(update.state.doc.toString()), 300)
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '12px', backgroundColor: '#f9fafb' },
            '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, monospace', overflow: 'auto' },
            '.cm-content': { padding: '8px 12px' },
            '.cm-gutters': { backgroundColor: '#f3f4f6', borderRight: '1px solid #e5e7eb', color: '#9ca3af' },
            '.cm-activeLineGutter': { backgroundColor: '#e5e7eb' },
            '.cm-activeLine': { backgroundColor: '#f0f4ff' },
          })
        ]
      }),
      parent: editorEl
    })
  })

  onDestroy(() => {
    clearTimeout(debounceTimer)
    view?.destroy()
  })

  function reset() {
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: originalYaml }
      })
    }
    error = null
    try { onUpdate?.(load(originalYaml)) } catch (_) {}
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

  <!-- CodeMirror editor -->
  <div bind:this={editorEl} class="flex-1 overflow-hidden"></div>
</div>
