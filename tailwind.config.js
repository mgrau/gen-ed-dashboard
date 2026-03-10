/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        odu: {
          blue: '#003057',
          lightblue: '#0067B1',
          gold: '#7C8034',
          gray: '#6D6E71'
        }
      }
    }
  },
  plugins: []
}
