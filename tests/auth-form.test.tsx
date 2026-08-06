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
});

test("signin renders its own route copy and toggles password visibility", async () => {
  const [{ fireEvent, render }, { default: AuthForm }] = await uiModules;
  const view = render(<AuthForm mode="signin" />);
  const passwordInput = view.getByLabelText("Password") as HTMLInputElement;
  const signupLink = view.getByRole("link", { name: /회원가입/ }) as HTMLAnchorElement;

  assert.equal(view.getByRole("heading").textContent, "Welcom, Back!");
  assert.equal(new URL(signupLink.href).pathname, "/signup");
  assert.equal(passwordInput.type, "password");

  fireEvent.click(view.getByRole("button", { name: "비밀번호 보기" }));

  assert.equal(passwordInput.type, "text");
  assert.equal(
    view.getByRole("button", { name: "비밀번호 숨기기" }).getAttribute("aria-pressed"),
    "true"
  );
});

test("signup renders confirmation and blocks passwords outside the policy", async () => {
  const [{ fireEvent, render, waitFor }, { default: AuthForm }] = await uiModules;
  const view = render(<AuthForm mode="signup" />);
  const loginLink = view.getByRole("link", { name: /로그인/ }) as HTMLAnchorElement;

  assert.equal(view.getByRole("heading").textContent, "Sign Up");
  assert.equal(new URL(loginLink.href).pathname, "/login");

  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(view.getByLabelText("Password"), {
    target: { value: "password" },
  });
  fireEvent.change(view.getByLabelText("Password Confirm"), {
    target: { value: "password" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => {
    assert.match(view.getByRole("alert").textContent ?? "", /영문 대·소문자/);
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
  fireEvent.change(view.getByLabelText("Password Confirm"), {
    target: { value: "Different1!" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  await waitFor(() => {
    assert.equal(view.getByRole("alert").textContent, "비밀번호가 일치하지 않습니다.");
  });
});
