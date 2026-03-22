import fs from "node:fs/promises";
import path from "node:path";

export class DecisionHistoryStore {
  constructor({ filePath = "./data/decision-history.jsonl" } = {}) {
    this.filePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, "", "utf8");
  }

  async append(record) {
    const line = `${JSON.stringify(record)}\n`;
    await fs.appendFile(this.filePath, line, "utf8");
  }

  async listRecent(limit = 20) {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const recent = lines.slice(-Math.max(1, Math.min(500, limit)));
      const parsed = [];

      for (const line of recent) {
        try {
          parsed.push(JSON.parse(line));
        } catch {
          // Skip malformed lines.
        }
      }

      return parsed.reverse();
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}
