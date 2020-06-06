const fs = require("fs").promises;

export async function fetchNode(url: string) {
  const result = await fs.readFile(url);
  return {
    async text() {
      return result.toString();
    },
    ok: true
  };
}
