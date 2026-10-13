import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { route } from "@/server/http/route";

function call(handler: ReturnType<typeof route>) {
  return handler(new NextRequest("http://localhost:3000/api/v1/anything"), {
    params: Promise.resolve({}),
  });
}

describe("route wrapper error handling", () => {
  it("answers an unexpected failure with a generic 500 that reveals nothing", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("connection string mongodb://user:secret@host");
    const handler = route({}, async () => {
      throw failure;
    });

    const response = await call(handler);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    expect(text).not.toContain("secret");
    // The real cause still reaches the server log.
    expect(logged).toHaveBeenCalledWith(expect.any(String), failure);

    logged.mockRestore();
  });

  it("lets the framework's own control-flow errors pass through", async () => {
    // Next.js signals things like notFound() and build-time bail-outs by
    // throwing. Turning those into a 500 would break the framework.
    const handler = route({}, async () => {
      notFound();
    });

    await expect(call(handler)).rejects.toThrow();
  });
});
