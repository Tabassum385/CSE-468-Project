export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#08111f",
        panel: "#101b2d",
        panel2: "#0c1727",
        line: "rgba(148, 163, 184, 0.16)",
        violet: "#6046e8",
        mint: "#18d88b",
        rose: "#ff5470"
      },
      boxShadow: {
        glow: "0 18px 60px rgba(33, 52, 98, 0.42)"
      }
    }
  },
  plugins: []
};
