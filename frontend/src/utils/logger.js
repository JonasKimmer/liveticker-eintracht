const isDev = process.env.NODE_ENV === "development";

const logger = {
  debug: (...args) => { if (isDev) console.debug(...args); },
  info:  (...args) => { if (isDev) console.info(...args); },
  warn:  (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
