const config = {
  clubName: "Liveticker",
  primaryColor: "#f5a623",
  secondaryColor: "#e8940f",
  accentColor: "#ffd700",
  darkBg: "#0d0d0d",
  darkCard: "#1a1a1a",
  darkBorder: "#2a2a2a",
  darkText: "#e0e0e0",
  darkMuted: "#888",
  apiBase:
    process.env.REACT_APP_API_BASE ||
    "https://liveticker-eintracht-2.onrender.com/api/v1",
  n8nBase: process.env.REACT_APP_N8N_BASE || "https://5c068710.sge.de/webhook",
};

export default config;
