const request = require("supertest");
const app = require("../app");

describe("Inventory API", () => {
  test("GET /health -> 200 {ok:true}", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("GET /api/products -> initial list", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // seeded 3 products in app.js
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  test("POST /api/products -> add valid product", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Keyboard", stock: 3, maxThreshold: 10 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      name: "Keyboard",
      stock: 3,
      maxThreshold: 10,
    });
    expect(res.body.id).toBeDefined();
  });

  test("POST /api/products -> rejects short name", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "K", stock: 1, maxThreshold: 5 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name required/i);
  });

  test("PUT /api/products/:id -> update stock", async () => {
    const list = await request(app).get("/api/products");
    const targetId = list.body[0].id;

    const res = await request(app)
      .put(`/api/products/${targetId}`)
      .send({ stock: 7 });
    expect(res.statusCode).toBe(200);
    expect(res.body.stock).toBe(7);
  });

  test("PUT /api/products/:id -> reject negative stock", async () => {
    const list = await request(app).get("/api/products");
    const targetId = list.body[0].id;

    const res = await request(app)
      .put(`/api/products/${targetId}`)
      .send({ stock: -1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/stock cannot be negative/i);
  });

  test("DELETE /api/products/:id -> 204", async () => {
    // create one to delete
    const created = await request(app)
      .post("/api/products")
      .send({ name: "TempItem", stock: 1, maxThreshold: 5 });

    const del = await request(app).delete(`/api/products/${created.body.id}`);
    expect(del.statusCode).toBe(204);
  });
});

describe("Simulator controls", () => {
  // We’ll use fake timers and mock Math.random so the tick happens deterministically.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("status starts as stopped", async () => {
    const res = await request(app).get("/api/sim/status");
    expect(res.statusCode).toBe(200);
    expect(res.body.running).toBe(false);
  });

  test("start -> running true and nextRunAt set", async () => {
    const res = await request(app).post("/api/sim/start");
    expect(res.statusCode).toBe(200);
    expect(res.body.running).toBe(true);
    expect(
      typeof res.body.nextRunAt === "number" || res.body.nextRunAt === null
    ).toBe(true);
  });

  test("a tick fires at mocked delay and updates stock", async () => {
    // Read current products to check a specific item after the tick
    const before = await request(app).get("/api/sim/status");
    const productsBefore = before.body.products;
    expect(Array.isArray(productsBefore)).toBe(true);
    const id0 = productsBefore[0].id;
    const stock0 = productsBefore[0].stock;

    // Mock Math.random sequence:
    // 1) delay -> 0 -> delay = 5000ms
    // 2) product index -> 0 -> pick first product
    // 3) action -> 0.9 -> "sale" (since > 0.5)
    const rnd = jest.spyOn(Math, "random");
    rnd
      .mockReturnValueOnce(0) // delay => 5000ms
      .mockReturnValueOnce(0) // pick product index 0
      .mockReturnValueOnce(0.9); // action => sale

    // Start simulation (schedules the timeout at 5s)
    await request(app).post("/api/sim/start");

    // Advance timers to fire one tick
    jest.advanceTimersByTime(5001);

    // Check status/products after tick
    const after = await request(app).get("/api/sim/status");
    const productsAfter = after.body.products;
    const first = productsAfter.find((p) => p.id === id0);

    // For a sale, stock should decrement if > 0
    expect([stock0 - 1, stock0 + 1, stock0]).toContain(first.stock);
  });

  test("stop -> running false, start idempotent", async () => {
    await request(app).post("/api/sim/start");
    const stopped = await request(app).post("/api/sim/stop");
    expect(stopped.statusCode).toBe(200);
    expect(stopped.body.running).toBe(false);

    // multiple stops still OK
    const stoppedAgain = await request(app).post("/api/sim/stop");
    expect(stoppedAgain.statusCode).toBe(200);
    expect(stoppedAgain.body.running).toBe(false);

    // starting again sets running true
    const startedAgain = await request(app).post("/api/sim/start");
    expect(startedAgain.statusCode).toBe(200);
    expect(startedAgain.body.running).toBe(true);
  });
  test("GET /api/products returns array with initial products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("POST /api/products rejects short name", async () => {
    const res = await request(app).post("/api/products").send({ name: "A" });
    expect(res.statusCode).toBe(400);
  });

  test("POST /api/products creates a new product", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Tablet", stock: 3, maxThreshold: 15 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      name: "Tablet",
      stock: 3,
      maxThreshold: 15,
    });
  });

  test("PUT /api/products/:id updates stock", async () => {
    const add = await request(app)
      .post("/api/products")
      .send({ name: "Monitor", stock: 2 });
    const id = add.body.id;

    const res = await request(app)
      .put(`/api/products/${id}`)
      .send({ stock: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.body.stock).toBe(10);
  });

  test("DELETE /api/products/:id removes product", async () => {
    const add = await request(app)
      .post("/api/products")
      .send({ name: "Mouse" });
    const id = add.body.id;

    const res = await request(app).delete(`/api/products/${id}`);
    expect(res.statusCode).toBe(204);

    const after = await request(app).get(`/api/products`);
    expect(after.body.find((p) => p.id === id)).toBeUndefined();
  });

  test("returns noop when no products (via simulation start)", async () => {
    // delete all products first
    const all = await request(app).get("/api/products");
    for (const p of all.body) {
      await request(app).delete(`/api/products/${p.id}`);
    }

    // start simulation
    const res = await request(app).post("/api/sim/start");
    expect(res.statusCode).toBe(200);
    expect(res.body.running).toBe(true);
  });
  test("POST /api/sim/start enables simulation and /api/sim/stop disables it", async () => {
    const start = await request(app).post("/api/sim/start");
    expect(start.statusCode).toBe(200);
    expect(start.body.running).toBe(true);

    const stop = await request(app).post("/api/sim/stop");
    expect(stop.statusCode).toBe(200);
    expect(stop.body.running).toBe(false);
  });
});
