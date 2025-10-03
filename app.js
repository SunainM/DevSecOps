// app.js
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- health check for tests ---
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// --- in-memory inventory ---
let products = [
  { id: 1, name: "Laptop", stock: 5, maxThreshold: 20 },
  { id: 2, name: "Phone", stock: 10, maxThreshold: 30 },
  { id: 3, name: "Headphones", stock: 15, maxThreshold: 25 },
];

// list
app.get("/api/products", (_req, res) => res.json(products));

// add
app.post("/api/products", (req, res) => {
  const { name, stock = 0, maxThreshold = 10 } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: "name required (min 2 chars)" });
  }
  if (stock < 0)
    return res.status(400).json({ error: "stock cannot be negative" });

  const id = products.length ? products[products.length - 1].id + 1 : 1;
  const p = {
    id,
    name: String(name).trim(),
    stock: Number(stock),
    maxThreshold: Number(maxThreshold),
  };
  products.push(p);
  res.status(201).json(p);
});

// update (stock/threshold/name)
app.put("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const p = products.find((x) => x.id === id);
  if (!p) return res.status(404).json({ error: "not found" });

  const { name, stock, maxThreshold } = req.body || {};
  if (name !== undefined && String(name).trim().length < 2)
    return res.status(400).json({ error: "name too short" });
  if (stock !== undefined && Number(stock) < 0)
    return res.status(400).json({ error: "stock cannot be negative" });
  if (maxThreshold !== undefined && Number(maxThreshold) < 0)
    return res.status(400).json({ error: "maxThreshold cannot be negative" });

  if (name !== undefined) p.name = String(name).trim();
  if (stock !== undefined) p.stock = Number(stock);
  if (maxThreshold !== undefined) p.maxThreshold = Number(maxThreshold);

  res.json(p);
});

// delete
app.delete("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const before = products.length;
  products = products.filter((x) => x.id !== id);
  if (products.length === before)
    return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

// --- Simulation engine ---
let simRunning = false;
let simTimer = null;
let nextRunAt = null;

function scheduleSimulation() {
  if (!simRunning) return;
  const delay = Math.floor(Math.random() * 1500) + 500; // 5–20 sec
  nextRunAt = Date.now() + delay;

  simTimer = setTimeout(() => {
    runSimulation();
    scheduleSimulation(); // reschedule next tick
  }, delay);
}

function runSimulation() {
  if (products.length === 0) return;

  const p = products[Math.floor(Math.random() * products.length)];
  const action = Math.random() > 0.5 ? "sale" : "purchase";

  if (action === "sale" && p.stock > 0) {
    p.stock -= 1;
  } else if (action === "purchase" && p.stock < p.maxThreshold) {
    p.stock += 1;
  }
}

// start sim
app.post("/api/sim/start", (_req, res) => {
  if (!simRunning) {
    simRunning = true;
    scheduleSimulation();
  }
  res.json({ running: simRunning, nextRunAt });
});

// stop sim
app.post("/api/sim/stop", (_req, res) => {
  if (simTimer) clearTimeout(simTimer);
  simRunning = false;
  simTimer = null;
  nextRunAt = null;
  res.json({ running: simRunning });
});

// status
app.get("/api/sim/status", (_req, res) => {
  res.json({ running: simRunning, nextRunAt, products });
});

module.exports = app;
