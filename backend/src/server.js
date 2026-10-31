import "dotenv/config";
import app from "./app.js";
import { disconnectDatabase } from "./db.js";

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => console.log(`Canteen API listening on port ${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; closing server`);
  server.close(async (error) => {
    await disconnectDatabase();
    if (error) {
      console.error("Shutdown failed:", error.message);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
