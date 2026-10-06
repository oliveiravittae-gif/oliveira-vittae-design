import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  stdio: "inherit",
  env: { ...process.env, GITHUB_PAGES: "true" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// TanStack emits the static client and prerendered HTML together.
const source = existsSync("dist/client/index.html") ? "dist/client" : "dist";
const html = readFileSync(`${source}/index.html`, "utf8");
if (!html.includes("Oliveira Vittae Designer"))
  throw new Error("Landing page missing from static HTML");
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
  if (!existsSync(resolve(source, `.${match[1]}`))) throw new Error(`Missing asset: ${match[1]}`);
}
rmSync("pages-dist", { recursive: true, force: true });
if (source !== "dist") {
  // Publish only client output, never the server bundle.
  cpSync(source, "pages-dist", { recursive: true });
} else {
  if (readdirSync("dist").includes("server"))
    throw new Error("Server bundle found in publish directory");
  cpSync("dist", "pages-dist", { recursive: true });
}
writeFileSync("pages-dist/.nojekyll", "");
// GitHub Pages serves directory indexes for direct entry on each static route.
for (const route of ["representantes", "admin", "verificar"]) {
  const path = `pages-dist/${route}/index.html`;
  if (!existsSync(path)) throw new Error(`Missing prerendered route: /${route}`);
}
console.log("Static landing page and referenced assets verified in pages-dist.");
