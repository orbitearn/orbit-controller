import localtunnel from "localtunnel";
import { PORT } from "./envs";
import { l } from "../common//utils";

async function openTunnel() {
  try {
    const tunnel = await localtunnel({ port: Number(PORT) });
    l(`🚀 Tunnel opened at: ${tunnel.url}`);

    tunnel.on("close", () => {
      l("Tunnel closed");
      process.exit(0);
    });

    tunnel.on("error", (err) => {
      l("Tunnel error:", err);
      process.exit(1);
    });

    process.on("SIGINT", () => {
      l("Closing tunnel...");
      tunnel.close();
    });
  } catch (error) {
    l("Error opening tunnel:", error);
    process.exit(1);
  }
}

openTunnel();
