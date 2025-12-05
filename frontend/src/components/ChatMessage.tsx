import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import CitationCard from './CitationCard';
import Mermaid from '@/components/Mermaid';

interface ChatMessageProps {
  role: 'user' | 'agent' | 'system';
  content: string;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, className }) => {
  const isUser = role === 'user';

  // SYSTEM MESSAGE (no bubble)
  if (role === "system") {
    return (
      <div className="w-full flex justify-center my-3">
        <div className="text-xs text-muted-foreground text-center px-3 py-1 opacity-80">
          {content}
        </div>
      </div>
    );
  }

  // Shared markdown renderer options (with mermaid handling)
  const renderMarkdown = (text: string, key: React.Key) => (
    <div key={key} className="prose prose-invert max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const txt = String(children ?? "");
            const cls = className || "";

            const isMermaid =
              !inline &&
              (cls.includes("language-mermaid") || cls.includes("lang-mermaid"));

            if (isMermaid) {
              return <Mermaid chart={txt} />;
            }

            return (
              <code className={className} {...props}>
                {txt}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );

  // Parse content into text + citation cards
  const parseContent = (text: string) => {
    const citationPrefixes = ['Patent:', 'Title:', 'Source:', 'PDF:', 'Equation:'];
    const lines = text.split('\n');
    const parsedContent: JSX.Element[] = [];
    let currentTextBlock: string[] = [];

    lines.forEach((line, index) => {
      const citationType = citationPrefixes.find(prefix => line.startsWith(prefix));
      
      if (citationType) {
        if (currentTextBlock.length > 0) {
          parsedContent.push(
            renderMarkdown(currentTextBlock.join('\n'), `text-${index}`)
          );
          currentTextBlock = [];
        }

        const citationContent = line.substring(citationType.length).trim();
        parsedContent.push(
          <CitationCard
            key={`citation-${index}`}
            type={citationType.replace(':', '').toLowerCase() as any}
            content={citationContent}
          />
        );
      } else {
        currentTextBlock.push(line);
      }
    });

    if (currentTextBlock.length > 0) {
      parsedContent.push(
        renderMarkdown(currentTextBlock.join('\n'), 'text-end')
      );
    }

    return parsedContent;
  };

  return (
    <div
      className={cn(
        'flex w-full animate-fade-in gap-4 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {!isUser && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/20 text-accent shadow-sm backdrop-blur-md">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-6 py-4 shadow-sm overflow-hidden',
          'backdrop-blur-md text-foreground font-mono',
          isUser
            ? 'ml-auto rounded-tr-none bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 shadow-[0_0_15px_rgba(var(--accent),0.15)]'
            : 'mr-auto rounded-tl-none bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 shadow-[0_0_15px_rgba(var(--accent),0.15)]'
        )}
      >
        <div className="space-y-4 break-words whitespace-pre-wrap">
          {parseContent(content)}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
