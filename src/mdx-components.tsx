import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1
        className="text-3xl md:text-4xl font-bold text-navy mb-6 mt-10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="text-2xl md:text-3xl font-bold text-navy mb-4 mt-8"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-bold text-navy mb-3 mt-6">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-600 leading-relaxed mb-4">{children}</p>
    ),
    a: ({ href, children }) => {
      const isInternal = href?.startsWith("/");
      if (isInternal) {
        return (
          <Link href={href} className="text-gold hover:text-gold-light font-semibold transition-colors">
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light font-semibold transition-colors">
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 text-gray-600 space-y-2 mb-4">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => {
      // Check if this is a "Key Takeaway" answer block
      const text = typeof children === "string" ? children : "";
      const childArray = Array.isArray(children) ? children : [children];
      const isKeyTakeaway = childArray.some((child: unknown) => {
        if (typeof child === "string") return child.includes("Key Takeaway");
        if (child && typeof child === "object" && "props" in (child as Record<string, unknown>)) {
          const props = (child as { props?: { children?: unknown } }).props;
          const nested = props?.children;
          if (typeof nested === "string") return nested.includes("Key Takeaway");
          if (Array.isArray(nested)) return nested.some((n: unknown) => {
            if (typeof n === "string") return n.includes("Key Takeaway");
            if (n && typeof n === "object" && "props" in (n as Record<string, unknown>)) {
              const nProps = (n as { props?: { children?: string } }).props;
              return typeof nProps?.children === "string" && nProps.children.includes("Key Takeaway");
            }
            return false;
          });
        }
        return false;
      });

      if (isKeyTakeaway) {
        return (
          <blockquote className="border-l-4 border-gold bg-gold/5 pl-6 pr-6 py-4 my-8 rounded-r-lg not-italic text-navy">
            {children}
          </blockquote>
        );
      }

      return (
        <blockquote
          className="border-l-4 border-gold pl-6 my-6 italic text-navy/70"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {children}
        </blockquote>
      );
    },
    strong: ({ children }) => (
      <strong className="font-bold text-navy">{children}</strong>
    ),
    hr: () => <hr className="my-8 border-gray-200" />,
    img: (props) => (
      <img {...props} className="rounded-lg my-6 w-full" />
    ),
    ...components,
  };
}
