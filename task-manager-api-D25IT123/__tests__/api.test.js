const request = require("supertest");
const app = require("../server");

describe("Task Manager API", () => {
  test("GET / should return status 200", async () => {
    const response = await request(app).get("/");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.message).toBe(
      "Task Manager RESTful API is running"
    );
  });
});
