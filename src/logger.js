const now = () => new Date().toISOString();

function format(level, message, meta) {
  const base = `[${now()}] [${level}] ${message}`;
  if (!meta) return base;
  return `${base} ${JSON.stringify(meta)}`;
}

export const logger = {
  info(message, meta) {
    console.log(format("INFO", message, meta));
  },
  warn(message, meta) {
    console.warn(format("WARN", message, meta));
  },
  error(message, meta) {
    console.error(format("ERROR", message, meta));
  }
};
