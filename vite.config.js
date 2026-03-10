import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import yaml from '@modyfi/vite-plugin-yaml'

export default defineConfig({
  base: '/gen-ed-dashboard/',
  plugins: [
    svelte(),
    yaml()
  ]
})
