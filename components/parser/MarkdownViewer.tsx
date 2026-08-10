"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <article className="text-card-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 border-b border-border-subtle pb-3 text-lg font-semibold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-base font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-xs font-semibold">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-xs leading-5 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-1 pl-6 text-xs leading-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-1 pl-6 text-xs leading-5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg bg-upload-zone p-4 font-mono text-xs leading-5">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="font-mono text-xs">{children}</code>
          ),
          hr: () => <hr className="my-6 border-0 border-t border-border-subtle" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-upload-zone">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border-subtle px-3 py-2 last:border-b-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
