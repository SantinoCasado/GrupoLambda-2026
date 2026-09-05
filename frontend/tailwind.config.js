/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        vino: "#8f0018",       // Fondo principal
        mostaza: "#f7b538",    // Textos destacados, íconos, botones primarios
        caramelo: "#db7c26",   // Bordes activos, tarjetas secundarias
        calabaza: "#d8572a",   // Botones de acción, alertas medias
        terracota: "#c32f27",  // Acciones críticas, errores, advertencias
      },
    },
  },
  plugins: [],
};