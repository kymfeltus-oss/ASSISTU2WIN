/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        bg1: "var(--bg1)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        line: "var(--line)",
        cyan: "var(--cyan)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        success: "var(--semantic-success)",
        warning: "var(--semantic-warning)",
        danger: "var(--semantic-danger)",
        midnight: {
          start: "var(--bg1)",
          middle: "var(--bg2)",
          end: "var(--bg3)",
          surface: "var(--panel2)",
          card: "var(--panel-alpha)",
          border: "var(--row-line)",
        },
        pop: {
          cyan: "var(--cyan)",
          "cyan-foreground": "var(--bg3)",
          cyanGlow: "rgba(0, 242, 254, 0.45)",
          cyanSoft: "var(--accent-glow)",
          cyanBorder: "rgba(0, 242, 254, 0.4)",
          purple: "#6366F1",
        },
      },
      boxShadow: {
        "accent-pop": "0 4px 20px rgba(0, 242, 254, 0.3)",
        "accent-hover": "0 0 28px rgba(0, 242, 254, 0.45)",
        "accent-card-top": "0 -4px 15px rgba(0, 242, 254, 0.15)",
        "accent-badge": "0 0 8px rgba(0, 242, 254, 0.3)",
        "accent-focus": "0 0 20px rgba(0, 242, 254, 0.25)",
      },
      backgroundImage: {
        "app-canvas": "var(--bg-canvas)",
        "ambient-sheen": "var(--ambient-sheen)",
        "midnight-gradient": "var(--bg-canvas)",
      },
    },
  },
};
