import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3002/forgot-password",
});

class NoopIntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

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
  IntersectionObserver: { configurable: true, value: NoopIntersectionObserver },
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const uiModules = Promise.all([
  import("@testing-library/react"),
  import("../components/auth/ForgotPasswordForm"),
  import("../components/auth/ResetPasswordForm"),
]);

afterEach(async () => {
  const [{ act, cleanup }] = await uiModules;
  await act(async () => {
    cleanup();
    await Promise.resolve();
  });
});

function supabaseWithAuth(auth: object): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

function authListener() {
  return {
    data: {
      subscription: {
        id: "test-listener",
        callback: () => undefined,
        unsubscribe: () => undefined,
      },
    },
  };
}

test("password reset requests never reveal whether an email exists", async () => {
  const [{ fireEvent, render, waitFor }, { default: ForgotPasswordForm }] = await uiModules;
  let request: unknown;
  const client = supabaseWithAuth({
    resetPasswordForEmail: async (email: string, options: unknown) => {
      request = { email, options };
      return {
        data: {},
        error: { code: "user_not_found", message: "User not found" },
      };
    },
  });
  const view = render(<ForgotPasswordForm getSupabase={() => client} />);

  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "unknown@example.com" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => {
    assert.match(view.getByRole("status").textContent ?? "", /If an account exists/);
  });
  assert.deepEqual(request, {
    email: "unknown@example.com",
    options: { redirectTo: "http://localhost:3002/reset-password" },
  });
  assert.doesNotMatch(view.container.textContent ?? "", /User not found/);
});

test("an invalid recovery session offers a new reset link", async () => {
  const [{ render, waitFor }, , { default: ResetPasswordForm }] = await uiModules;
  const client = supabaseWithAuth({
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: authListener,
  });
  const view = render(<ResetPasswordForm getSupabase={() => client} />);

  await waitFor(() => {
    assert.equal(view.getByRole("heading").textContent, "Reset link unavailable");
  });
  assert.equal(
    new URL((view.getByRole("link", { name: /Request a new/ }) as HTMLAnchorElement).href).pathname,
    "/forgot-password",
  );
});

test("a valid recovery session validates and updates the password", async () => {
  const [{ fireEvent, render, waitFor }, , { default: ResetPasswordForm }] = await uiModules;
  let updatedPassword: unknown;
  let completed = 0;
  const session = { access_token: "recovery-token" };
  const client = supabaseWithAuth({
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: authListener,
    updateUser: async (attributes: unknown) => {
      updatedPassword = attributes;
      return { data: { user: {} }, error: null };
    },
  });
  const view = render(
    <ResetPasswordForm
      getSupabase={() => client}
      onPasswordUpdated={() => {
        completed += 1;
      }}
    />,
  );

  const password = await view.findByLabelText("New password") as HTMLInputElement;
  const confirmation = view.getByLabelText("Confirm new password") as HTMLInputElement;

  fireEvent.change(password, { target: { value: "weak" } });
  fireEvent.change(confirmation, { target: { value: "weak" } });
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() => assert.equal(password.getAttribute("aria-invalid"), "true"));
  assert.equal(document.activeElement, password);

  fireEvent.change(password, { target: { value: "Stronger1!" } });
  fireEvent.change(confirmation, { target: { value: "Stronger1!" } });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => assert.equal(completed, 1));
  assert.deepEqual(updatedPassword, { password: "Stronger1!" });
});
