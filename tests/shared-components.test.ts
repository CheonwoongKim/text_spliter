import assert from "node:assert/strict";
import test from "node:test";

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

test("shared components module exports all expected components", () => {
  assert.equal(typeof Button, "object"); // React forwardRef component is an object with $$typeof
  assert.equal(typeof Card, "object");
  assert.equal(typeof CardHeader, "object");
  assert.equal(typeof CardTitle, "object");
  assert.equal(typeof CardDescription, "object");
  assert.equal(typeof CardContent, "object");
  assert.equal(typeof CardFooter, "object");
  assert.equal(typeof Badge, "function");
  assert.equal(typeof FormField, "function");
  assert.equal(typeof Input, "object");
  assert.equal(typeof Select, "object");
  assert.equal(typeof Textarea, "object");
  assert.equal(typeof Modal, "function");
  assert.equal(typeof EmptyState, "function");
  assert.equal(typeof Pagination, "function");
});
