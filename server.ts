import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Active Server-Sent Events (SSE) clients
  let sseClients: { id: number; res: express.Response }[] = [];

  // 1. SSE Endpoint for agent status updates
  app.get("/api/agent-updates", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = Date.now();
    sseClients.push({ id: clientId, res });

    // Send initial connection confirm packet
    res.write(`data: ${JSON.stringify({ type: "connection", message: "UACP Swarm Radar Channel Connected." })}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // Helper arrays/objects to generate valid agent status updates in real-time
  const departments = [
    { prefix: "ENG", start: 1, end: 20 },
    { prefix: "GRO", start: 21, end: 40 },
    { prefix: "OPS", start: 41, end: 60 },
    { prefix: "RES", start: 61, end: 80 },
    { prefix: "REV", start: 81, end: 100 },
  ];

  function getRandomAgentId() {
    const rand = Math.random();
    if (rand < 0.05) {
      const leaders = ["AG-ENG-LDR", "AG-GRO-LDR", "AG-OPS-LDR", "AG-RES-LDR", "AG-REV-LDR", "AG-CORE-000"];
      return leaders[Math.floor(Math.random() * leaders.length)];
    }
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const num = Math.floor(Math.random() * (dept.end - dept.start + 1)) + dept.start;
    return `AG-${dept.prefix}-${String(num).padStart(3, "0")}`;
  }

  // Periodic agent updates dispatch loop (every 1.5 seconds)
  setInterval(() => {
    if (sseClients.length === 0) return;

    const agentId = getRandomAgentId();
    const randVal = Math.random();
    
    // Status distribution: 70% Active, 22% Idle, 8% Blocked
    const status = randVal < 0.7 ? "Active" : randVal < 0.92 ? "Idle" : "Blocked";

    const cpu = status === "Active" ? Math.floor(Math.random() * 50) + 40 : status === "Blocked" ? 0 : Math.floor(Math.random() * 8) + 2;
    const memory = status === "Active" ? Math.floor(Math.random() * 30) + 50 : status === "Blocked" ? 98 : Math.floor(Math.random() * 20) + 10;
    const latency = status === "Active" ? Math.floor(Math.random() * 12) + 2 : status === "Blocked" ? 999 : Math.floor(Math.random() * 10) + 8;

    const payload = {
      id: agentId,
      status,
      metrics: { cpu, memory, latency },
      timestamp: new Date().toISOString(),
    };

    const message = `data: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.res.write(message);
      } catch (err) {
        // Handle failed write gracefully
      }
    });
  }, 1500);

  // Other general API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", clientsConnected: sseClients.length });
  });

  // 2. Integration with Vite (Development vs Production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
