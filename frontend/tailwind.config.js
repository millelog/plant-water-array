/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './src/**/**/*.{js,jsx}',
    './node_modules/@shadcn/ui/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

