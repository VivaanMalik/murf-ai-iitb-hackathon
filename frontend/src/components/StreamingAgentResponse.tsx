import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import CitationCard from './CitationCard';

interface StreamingAgentResponseProps {
  fullText?: string;
  content?: string;
  isStreaming?: boolean;
  currentSentenceIndex?: number;
  className?: string;
}

export const StreamingAgentResponse: React.FC<StreamingAgentResponseProps> = ({
  fullText,
  content,
  isStreaming = true,
  className,
}) => {
  const textToRender = fullText || content || "";

  // Function to parse content and identify citations (same as ChatMessage)
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
            <div key={`text-${index}`} className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {currentTextBlock.join('\n')}
              </ReactMarkdown>
            </div>
          );
          currentTextBlock = [];
        }
        const content = line.substring(citationType.length).trim();
        parsedContent.push(
          <CitationCard
            key={`citation-${index}`}
            type={citationType.replace(':', '').toLowerCase() as any}
            content={content}
          />
        );
      } else {
        currentTextBlock.push(line);
      }
    });

    if (currentTextBlock.length > 0) {
      parsedContent.push(
        <div key="text-end" className="prose prose-invert max-w-none text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {currentTextBlock.join('\n')}
          </ReactMarkdown>
        </div>
      );
    }

    return parsedContent;
  };

  return (
    <div className={cn("flex w-full animate-fade-in gap-4 p-4 flex-row", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/20 text-accent shadow-sm backdrop-blur-md">
        <Bot className="h-5 w-5" />
      </div>
      
      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-6 py-4 shadow-sm overflow-hidden',
          'mr-auto rounded-tl-none',
          'bg-gradient-to-br from-accent/10 to-transparent', 
          'border border-accent/30',
          'shadow-[0_0_15px_rgba(var(--accent),0.15)]',
          'backdrop-blur-md text-foreground font-mono'
        )}
      >
        <div className="space-y-4 break-words whitespace-pre-wrap">
          {parseContent(textToRender)}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--accent),0.8)]" />
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamingAgentResponse;