"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { sanitizePlanBodyForDisplay } from "@/lib/extract-event-deep-dives";

const markdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h4 className="font-heading text-lg text-forge-accent tracking-wide mt-6 first:mt-0 mb-2">
      {children}
    </h4>
  ),
  h2: ({ children }) => (
    <h4 className="font-heading text-lg text-forge-accent tracking-wide mt-6 first:mt-0 mb-2">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h4 className="font-heading text-base text-forge-accent tracking-wide mt-5 first:mt-0 mb-2">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h4 className="font-heading text-base text-forge-accent tracking-wide mt-4 first:mt-0 mb-2">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-2.5 text-sm text-neutral-300 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-100">{children}</strong>
  ),
  em: ({ children }) => <em className="text-neutral-200 italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-3 ml-1 list-disc space-y-2 pl-5 text-sm text-neutral-300 leading-relaxed marker:text-forge-accent">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-1 list-decimal space-y-2 pl-5 text-sm text-neutral-300 leading-relaxed marker:text-forge-accent">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  hr: () => <hr className="my-6 border-0 border-t border-forge-border" />,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-forge-accent pl-4 text-neutral-400 text-sm leading-relaxed">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded-sm bg-forge-bg px-1.5 py-0.5 text-[13px] text-forge-accent">
          {children}
        </code>
      );
    }
    return (
      <code className="block overflow-x-auto rounded-sm bg-forge-bg p-3 text-[13px] text-neutral-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto border border-forge-border bg-forge-bg p-3 text-sm">
      {children}
    </pre>
  ),
};

export function PlanWeekMarkdown({ body }: { body: string }) {
  const cleaned = body?.trim() ? sanitizePlanBodyForDisplay(body) : "";
  if (!cleaned) {
    return <p className="text-sm text-neutral-500">—</p>;
  }
  return (
    <div className="forge-plan-markdown text-sm [&>*:first-child]:mt-0">
      <ReactMarkdown components={markdownComponents}>{cleaned}</ReactMarkdown>
    </div>
  );
}
