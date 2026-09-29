// Test-only resolver: lets Node's built-in TypeScript support load the app's
// extensionless relative imports (./engine -> ./engine.ts, ./makes -> ./makes/index.ts).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier) && context.parentURL) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const c of [base + ".ts", base + ".tsx", path.join(base, "index.ts")]) {
      if (existsSync(c)) return next(pathToFileURL(c).href, context);
    }
  }
  return next(specifier, context);
}
