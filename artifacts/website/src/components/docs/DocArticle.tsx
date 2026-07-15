import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

interface DocArticleProps {
  seoTitle: string;
  description: string;
  path: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  children: ReactNode;
}

/**
 * Consistent header + typography shell for a single /docs/* article. Body
 * content is rendered with Tailwind Typography (`prose`) so guide pages can
 * be written as plain headings/paragraphs/lists without re-styling each one.
 */
export function DocArticle({
  seoTitle,
  description,
  path,
  eyebrow = "Documentation",
  title,
  intro,
  jsonLd,
  children,
}: DocArticleProps) {
  return (
    <article>
      <Seo title={seoTitle} description={description} path={path} type="article" jsonLd={jsonLd} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
        <h1 className="text-3xl md:text-5xl font-heading font-bold mt-3 mb-4">{title}</h1>
        {intro && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">{intro}</p>
        )}
        <div
          className="prose prose-invert max-w-none
            prose-headings:font-heading prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-li:text-muted-foreground
            prose-strong:text-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-hr:border-white/10"
        >
          {children}
        </div>
      </motion.div>
    </article>
  );
}
