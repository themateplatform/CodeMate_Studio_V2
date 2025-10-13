import { test, expect } from "@playwright/test";

test.describe("Prompt → Site API", () => {
  test("POST /api/generate succeeds for blog recipe", async ({ page }) => {
    await page.goto("/");

    const token = await page.evaluate(async () => {
      const res = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      }
      const json = await res.json();
      return json?.csrfToken ?? json?.token ?? null;
    });

    expect(token).toBeTruthy();

    const result = await page.evaluate(async (csrfToken: string) => {
      const response = await fetch("/api/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          prompt: "create a blog",
          recipe: "blog",
          validate: false,
        }),
      });

      const json = await response.json().catch(() => null);
      return {
        ok: response.ok,
        status: response.status,
        json,
      };
    }, token as string);

    expect(result.ok, `Unexpected status: ${result.status} -> ${JSON.stringify(result.json)}`).toBeTruthy();
    expect(result.json?.success).toBe(true);
    expect(typeof result.json?.recipeName).toBe("string");
    expect((result.json?.recipeName ?? "").length).toBeGreaterThan(0);
    expect(typeof result.json?.outputPath).toBe("string");
    expect((result.json?.outputPath ?? "").length).toBeGreaterThan(0);
  });
});
