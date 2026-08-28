import { test as setup, expect } from "@playwright/test";
import { ORIGINS } from "./routes";

const email = process.env.COMPARE_EMAIL;
const password = process.env.COMPARE_PASSWORD;

/* Selectors verified against apps/web-stylex/src/components/sign-in-form.tsx:
   - email input: Label htmlFor={field.name} / Input id={field.name} at lines 63-65,
     label text is t("email") = "Email" (packages/i18n/messages/en.json)
   - password input: same pattern at lines 86-88, label text "Password"
   - submit button: lines 109-115, text is t("signIn") = "Sign in" while idle
     ("Signing in…" — state.isSubmitting — while pending), matching /log in|sign in/i. */
for (const [key, origin] of Object.entries(ORIGINS)) {
  setup(`log in on ${key}`, async ({ page }) => {
    if (!email || !password) {
      throw new Error("compare: set COMPARE_EMAIL and COMPARE_PASSWORD to an existing account");
    }
    await page.goto(`${origin}/auth/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`^${origin}/hiring-processes`));
    await page.context().storageState({ path: `compare/.auth/${key}.json` });
  });
}
