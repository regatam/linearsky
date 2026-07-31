import { expect, test } from "@playwright/test";

test("renders the complete fixture sky and opens agent judgment", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Everything in flight/i })).toBeVisible();
  await expect(page.getByTestId("project-span")).toHaveCount(4);
  await expect(page.locator('[data-pace="on-track"]')).toHaveCount(2);
  await expect(page.locator('[data-pace="at-risk"]')).toHaveCount(1);
  await expect(page.locator('[data-pace="off-track"]')).toHaveCount(1);
  await expect(page.getByTestId("milestone-tick")).toHaveCount(7);
  await expect(page.getByTestId("undated-shelf")).toContainText("Compass research sprint");
  await expect(page.getByTestId("annotation-marker")).toHaveCount(1);

  await page.getByRole("button", { name: "Open Nimbus mobile beta" }).click();
  const panel = page.getByTestId("project-panel");
  await expect(panel).toContainText("Agent judgment");
  await expect(panel).toContainText("offline sync is carrying too much launch risk");
  await expect(panel).toContainText("high confidence");
});
