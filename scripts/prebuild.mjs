import { execSync } from "node:child_process";

execSync("prisma generate", { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL detectada, ejecutando prisma db push...");
  execSync("prisma db push --skip-generate", { stdio: "inherit" });
} else {
  console.log("DATABASE_URL no definida, se omite prisma db push.");
}
