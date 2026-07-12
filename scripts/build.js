const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

try {
  console.log("[ArenaSphere Build] Installing frontend dependencies...");
  execSync("npm install", { cwd: path.join(__dirname, "../frontend"), stdio: "inherit" });

  console.log("[ArenaSphere Build] Building frontend Vite application...");
  execSync("npm run build", { cwd: path.join(__dirname, "../frontend"), stdio: "inherit" });

  console.log("[ArenaSphere Build] Moving static output to /public...");
  const src = path.join(__dirname, "../frontend/dist");
  const dest = path.join(__dirname, "../public");

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  
  // Ensure the parent directory of public exists (root)
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);

  console.log("[ArenaSphere Build] Build completed successfully! Static files are in /public.");
} catch (err) {
  console.error("[ArenaSphere Build] Build failed:", err.message);
  process.exit(1);
}
