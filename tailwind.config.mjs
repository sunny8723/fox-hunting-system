/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neonBlue: '#00f3ff',
                neonGreen: '#39ff14',
            },
        },
    },
    plugins: [],
}
