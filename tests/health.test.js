const request = require("supertest");
const app = require("../app");

test("GET /health -> { ok: true }", async () => {
  const res = await request(app).get("/health");
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
