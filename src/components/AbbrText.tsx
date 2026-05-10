import { Fragment, type ReactNode } from "react";
import { ABBREVIATIONS, ABBR_REGEX } from "@/lib/abbreviations";

/**
 * Wraps every known abbreviation found in `text` with a native <abbr> element
 * so the browser shows the meaning on mouse-hover. Native <abbr title="...">
 * works everywhere with zero JS overhead and is screen-reader friendly.
 *
 * Usage: <AbbrText>Cat A punches block MC until cleared.</AbbrText>
 */
export function AbbrText({ children }: { children: ReactNode }): ReactNode {
  if (typeof children === "string") return decorate(children);

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((c, i) => (
          <Fragment key={i}>{typeof c === "string" ? decorate(c) : c}</Fragment>
        ))}
      </>
    );
  }
  return <>{children}</>;
}

function decorate(text: string): ReactNode {
  // Reset lastIndex since the regex is global.
  ABBR_REGEX.lastIndex = 0;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = ABBR_REGEX.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[1];
    parts.push(
      <abbr
        key={key++}
        title={ABBREVIATIONS[token]}
        className="cursor-help underline decoration-dotted decoration-accent/60 underline-offset-4"
      >
        {token}
      </abbr>,
    );
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
