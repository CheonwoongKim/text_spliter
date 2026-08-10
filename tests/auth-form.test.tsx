import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3002/login",
});

Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  self: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  Node: { configurable: true, value: dom.window.Node },
  Event: { configurable: true, value: dom.window.Event },
  MouseEvent: { configurable: true, value: dom.window.MouseEvent },
  FormData: { configurable: true, value: dom.window.FormData },
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const uiModules = Promise.all([
  import("@testing-library/react"),
  import("../components/auth/AuthForm"),
]);

afterEach(async () => {
  const [{ cleanup }] = await uiModules;
  cleanup();
  dom.window.localStorage.clear();
});

test("signin renders its own route copy and toggles password visibility", async () => {
  const [{ fireEvent, render }, { default: AuthForm }] = await uiModules;
  const view = render(<AuthForm mode="signin" />);
  const passwordInput = view.getByLabelText("Password") as HTMLInputElement;
  const signupLink = view.getByRole("link", { name: /Sign up/ }) as HTMLAnchorElement;

  assert.equal(view.getByRole("heading").textContent, "Welcome back");
  assert.equal(new URL(signupLink.href).pathname, "/signup");
  assert.equal(passwordInput.type, "password");

  fireEvent.click(view.getByRole("button", { name: "Show password" }));

  assert.equal(passwordInput.type, "text");
  assert.equal(
    view.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed"),
    "true"
  );
});

test("signin restores, updates, and removes the remembered email", async () => {
  const [{ fireEvent, render, waitFor }, { default: AuthForm }] = await uiModules;
  const { getRememberedEmail, saveRememberedEmail } = await import("../lib/auth");
  saveRememberedEmail("saved@example.com");

  const view = render(<AuthForm mode="signin" />);
  const emailInput = view.getByLabelText("Email") as HTMLInputElement;
  const rememberCheckbox = view.getByRole("checkbox", {
    name: "Remember email",
  }) as HTMLInputElement;

  assert.match(rememberCheckbox.className, /appearance-none/);
  assert.match(rememberCheckbox.className, /rounded-sm/);
  assert.match(rememberCheckbox.className, /border-border/);
  assert.doesNotMatch(rememberCheckbox.className, /border-control/);
  assert.doesNotMatch(rememberCheckbox.className, /focus-ring/);
  assert.match(rememberCheckbox.className, /focus-visible:border-surface-foreground/);

  await waitFor(() => {
    assert.equal(emailInput.value, "saved@example.com");
    assert.equal(rememberCheckbox.checked, true);
  });

  fireEvent.change(emailInput, { target: { value: "updated@example.com" } });
  fireEvent.click(rememberCheckbox);
  assert.equal(getRememberedEmail(), null);

  fireEvent.click(rememberCheckbox);
  assert.equal(getRememberedEmail(), "updated@example.com");
});

test("signup renders confirmation and blocks passwords outside the policy", async () => {
  const [{ fireEvent, render, waitFor }, { default: AuthForm }] = await uiModules;
  const view = render(<AuthForm mode="signup" />);
  const loginLink = view.getByRole("link", { name: /Sign in/ }) as HTMLAnchorElement;

  assert.equal(view.getByRole("heading").textContent, "Create your account");
  assert.equal(new URL(loginLink.href).pathname, "/login");
  assert.equal(view.queryByRole("checkbox", { name: "Remember email" }), null);

  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(view.getByLabelText("Password"), {
    target: { value: "password" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "password" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => {
    assert.match(view.getByRole("alert").textContent ?? "", /upper and lower case/i);
  });
});

test("signup blocks a mismatched confirmation after policy validation", async () => {
  const [{ fireEvent, render, waitFor }, { default: AuthForm }] = await uiModules;
  const view = render(<AuthForm mode="signup" />);

  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(view.getByLabelText("Password"), {
    target: { value: "Strong1!" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "Different1!" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => {
    assert.equal(view.getByRole("alert").textContent, "Passwords do not match.");
  });
});
