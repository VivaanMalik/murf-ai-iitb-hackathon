// src/components/Mermaid.tsx
import React, { useEffect, useRef, useState } from "react";

// We already have katex in deps; use it to render LaTeX to HTML.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import katex from "katex";

interface MermaidProps {
  chart: string;
}

// Preprocess Mermaid source: convert $...$ into KaTeX HTML
function preprocessMermaidLatex(input: string): string {
  const latexRegex = /\$(.+?)\$/g;

  return input.replace(latexRegex, (_match: string, expr: string) => {
    try {
      const html = katex.renderToString(expr, {
        throwOnError: false,
        output: "html", // default, but explicit
      });
      // Avoid double quotes inside labels; use single quotes instead
      return html.replace(/"/g, "'");
    } catch (err) {
      console.error("KaTeX render error in Mermaid diagram:", err, "expr:", expr);
      // Fallback: return the raw expr without $...$
      return expr;
    }
  });
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // Manage SVG blob URL for open/download
  useEffect(() => {
    if (!svgCode) {
      if (svgUrl) {
        URL.revokeObjectURL(svgUrl);
        setSvgUrl(null);
      }
      return;
    }

    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    setSvgUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [svgCode]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!chart?.trim()) {
      el.innerHTML = "";
      setSvgCode(null);
      return;
    }

    const renderDiagram = async () => {
      try {
        // dynamic import so initial load can't break
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const mod = await import("mermaid");
        const mermaid: any = mod.default || mod;

        // Read theme from your CSS vars
        const root = document.documentElement;
        const styles = getComputedStyle(root);

        const accentRaw =
          styles.getPropertyValue("--accent").trim() || "220 90% 60%";
        const bgRaw =
          styles.getPropertyValue("--card").trim() ||
          styles.getPropertyValue("--background").trim() ||
          "220 10% 10%";
        const fgRaw =
          styles.getPropertyValue("--foreground").trim() || "220 20% 95%";

        const accentColor = `hsl(${accentRaw})`;
        const bgColor = `hsl(${bgRaw})`;
        const fgColor = `hsl(${fgRaw})`;
        const isLight = root.classList.contains("light");

        if (!(window as any).__mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: isLight ? "base" : "dark",
            themeVariables: {
              primaryColor: accentColor,
              primaryBorderColor: accentColor,
              primaryTextColor: fgColor,

              secondaryColor: bgColor,
              secondaryBorderColor: accentColor,
              secondaryTextColor: fgColor,

              tertiaryColor: bgColor,
              tertiaryBorderColor: accentColor,

              lineColor: accentColor,
              textColor: fgColor,
              background: "transparent",
              fontFamily:
                "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            },
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true, // 🔥 needed for KaTeX HTML
              curve: "basis",
            },
          });
          (window as any).__mermaidInitialized = true;
        }

        const id = "mermaid-" + Math.random().toString(36).slice(2);

        // 🔥 Preprocess LaTeX BEFORE parsing/rendering
        const processedChart = preprocessMermaidLatex(chart);

        // Syntax check on processed chart
        try {
          await mermaid.parse(processedChart);
        } catch (err) {
          console.error(
            "Mermaid parse error:",
            err,
            "\noriginal diagram:",
            chart,
            "\nprocessed diagram:",
            processedChart
          );
          el.innerHTML =
            '<pre class="text-xs text-red-500">Mermaid parse error (see console)</pre>';
          setSvgCode(null);
          return;
        }

        const result = await mermaid.render(id, processedChart);

        if (ref.current) {
          ref.current.innerHTML = result.svg;
          setSvgCode(result.svg);

          if (result.bindFunctions) {
            result.bindFunctions(ref.current);
          }
        }
      } catch (err) {
        console.error("Mermaid render error:", err, "diagram:", chart);
        if (ref.current) {
          ref.current.innerHTML =
            '<pre class="text-xs text-red-500">Mermaid render error (see console)</pre>';
        }
        setSvgCode(null);
      }
    };

    renderDiagram();
  }, [chart]);

  return (
    <div className="space-y-1">
      <div
        ref={ref}
        className="mermaid-diagram my-2 rounded-md border border-border bg-card p-2 w-full overflow-x-auto"
      />
      {svgUrl && (
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <a
            href={svgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Open as SVG
          </a>
          <a
            href={svgUrl}
            download="diagram.svg"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Download SVG
          </a>
        </div>
      )}
    </div>
  );
};

export default Mermaid;
