import { cn } from "@/lib/utils";
import { FileText, Link2, BookOpen, FlaskConical } from "lucide-react";

interface CitationCardProps {
  type: "patent" | "title" | "source" | "pdf" | "equation";
  content: string;
  className?: string;
}

const CitationCard = ({ type, content, className }: CitationCardProps) => {
  const getIcon = () => {
    switch (type) {
      case "patent":
        return <FileText className="w-5 h-5" />;
      case "title":
        return <BookOpen className="w-5 h-5" />;
      case "source":
        return <Link2 className="w-5 h-5" />;
      case "pdf":
        return <FileText className="w-5 h-5" />;
      case "equation":
        return <FlaskConical className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div
      className={cn(
        "bg-citation-card border-2 border-citation-card-border rounded-lg p-4 my-3",
        "shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]",
        "transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-accent mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-citation-label text-xs font-semibold uppercase tracking-wider mb-1">
            {getLabel()}
          </div>
          <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitationCard;
