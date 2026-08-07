import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  FormField,
  Input,
  Select,
  Textarea,
  Modal,
  EmptyState,
  Pagination,
} from "../components/shared";

test("Button renders correct variant classes, icons, and loading state", () => {
  const primaryHtml = renderToStaticMarkup(
    React.createElement(Button, { variant: "primary", size: "md" }, "Submit")
  );
  assert.match(primaryHtml, /bg-surface-foreground/);
  assert.match(primaryHtml, /text-surface/);
  assert.match(primaryHtml, /Submit/);

  const dangerHtml = renderToStaticMarkup(
    React.createElement(Button, { variant: "danger", size: "sm" }, "Delete")
  );
  assert.match(dangerHtml, /bg-danger-surface/);
  assert.match(dangerHtml, /text-danger/);

  const loadingHtml = renderToStaticMarkup(
    React.createElement(Button, { isLoading: true }, "Saving")
  );
  assert.match(loadingHtml, /animate-spin/);
  assert.match(loadingHtml, /disabled=""/);
});

test("Card renders structure, padding, and interactive styles", () => {
  const cardHtml = renderToStaticMarkup(
    React.createElement(
      Card,
      { interactive: true, shadow: "lg" },
      React.createElement(CardHeader, null, React.createElement(CardTitle, null, "Card Title")),
      React.createElement(CardContent, null, React.createElement(CardDescription, null, "Desc")),
      React.createElement(CardFooter, null, React.createElement(Button, null, "OK"))
    )
  );
  assert.match(cardHtml, /card-interactive/);
  assert.match(cardHtml, /shadow-lg/);
  assert.match(cardHtml, /Card Title/);
  assert.match(cardHtml, /Desc/);
  assert.match(cardHtml, /OK/);
});

test("Badge renders allowed design system status variants and dot", () => {
  const successHtml = renderToStaticMarkup(
    React.createElement(Badge, { variant: "success", dot: true }, "Active")
  );
  assert.match(successHtml, /bg-success-surface/);
  assert.match(successHtml, /text-success/);
  assert.match(successHtml, /bg-success/); // dot color
  assert.match(successHtml, /Active/);

  const dangerHtml = renderToStaticMarkup(
    React.createElement(Badge, { variant: "danger" }, "Failed")
  );
  assert.match(dangerHtml, /bg-danger-surface/);
  assert.match(dangerHtml, /text-danger/);
});

test("FormField binds label htmlFor to input/select/textarea id and displays hint or error", () => {
  const fieldHtml = renderToStaticMarkup(
    React.createElement(
      FormField,
      { label: "Email Address", hint: "Enter work email", required: true },
      React.createElement(Input, { id: "work-email", placeholder: "name@company.com" })
    )
  );
  const forMatch = fieldHtml.match(/for="([^"]+)"/);
  const idMatch = fieldHtml.match(/id="([^"]+)"/);
  assert.ok(forMatch && forMatch[1], "label should have a for attribute");
  assert.ok(idMatch && idMatch[1], "input should have an id attribute");
  assert.equal(forMatch[1], idMatch[1], "label for attribute must match input id");
  assert.equal(idMatch[1], "work-email", "an existing control id should be preserved");
  assert.match(fieldHtml, /Email Address/);
  assert.match(fieldHtml, /Enter work email/);
  assert.match(fieldHtml, /\*/);
  assert.match(fieldHtml, /required=""/);
  assert.match(fieldHtml, /aria-describedby="[^"]+-hint"/);

  const selectHtml = renderToStaticMarkup(
    React.createElement(
      FormField,
      { label: "Role" },
      React.createElement(
        Select,
        { defaultValue: "user" },
        React.createElement("option", { value: "user" }, "User"),
        React.createElement("option", { value: "admin" }, "Admin")
      )
    )
  );
  assert.match(selectHtml, /<select/);
  assert.match(selectHtml, /Role/);

  const textareaHtml = renderToStaticMarkup(
    React.createElement(
      FormField,
      { label: "Bio" },
      React.createElement(Textarea, { placeholder: "Tell us about yourself" })
    )
  );
  assert.match(textareaHtml, /<textarea/);
  assert.match(textareaHtml, /Bio/);

  const errorHtml = renderToStaticMarkup(
    React.createElement(
      FormField,
      { label: "Password", error: "Password is required" },
      React.createElement(Input, { type: "password" })
    )
  );
  assert.match(errorHtml, /border-danger/);
  assert.match(errorHtml, /aria-invalid="true"/);
  assert.match(errorHtml, /aria-describedby="[^"]+-error"/);
  assert.match(errorHtml, /role="alert"/);
  assert.match(errorHtml, /Password is required/);

  const nativeInputHtml = renderToStaticMarkup(
    React.createElement(
      FormField,
      { label: "Native Email", error: "Email is required" },
      React.createElement("input", { id: "native-email" })
    )
  );
  assert.match(nativeInputHtml, /for="native-email"/);
  assert.match(nativeInputHtml, /aria-invalid="true"/);
  assert.doesNotMatch(nativeInputHtml, /\serror=/);
});

test("EmptyState renders title, description, and action button", () => {
  let clicked = false;
  const emptyHtml = renderToStaticMarkup(
    React.createElement(EmptyState, {
      title: "No Documents",
      description: "Upload a document to start parsing.",
      action: { label: "Upload", onClick: () => { clicked = true; } },
    })
  );
  assert.match(emptyHtml, /No Documents/);
  assert.match(emptyHtml, /Upload a document to start parsing\./);
  assert.match(emptyHtml, /Upload/);
  assert.equal(clicked, false);
});

test("Modal renders an accessible dialog when open and nothing when closed", () => {
  const openModalHtml = renderToStaticMarkup(
    React.createElement(
      Modal,
      {
        isOpen: true,
        onClose: () => {},
        title: "Test Modal",
        description: "Review the selected settings",
      },
      "Content"
    )
  );
  assert.match(openModalHtml, /role="dialog"/);
  assert.match(openModalHtml, /aria-modal="true"/);
  assert.match(openModalHtml, /aria-labelledby="[^"]+"/);
  assert.match(openModalHtml, /aria-label="Close Test Modal"/);
  assert.match(openModalHtml, /Review the selected settings/);
  assert.match(openModalHtml, /Content/);

  const modalHtml = renderToStaticMarkup(
    React.createElement(
      Modal,
      { isOpen: false, onClose: () => {}, title: "Test Modal" },
      "Content"
    )
  );
  assert.equal(modalHtml, "");
});

test("Pagination calculates bounds and renders navigation buttons", () => {
  const paginationHtml = renderToStaticMarkup(
    React.createElement(Pagination, {
      page: 1,
      total: 50,
      rowsPerPage: 10,
      onPageChange: () => {},
    })
  );
  assert.match(paginationHtml, /Showing 11 to 20 of 50 results/);
  assert.match(paginationHtml, /Previous/);
  assert.match(paginationHtml, /Next/);
});
