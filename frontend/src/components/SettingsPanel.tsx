import { useState } from "react";
import { Settings, X, Palette, Volume2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface SettingsPanelProps {
  voicePersona: string;
  onVoicePersonaChange: (persona: string) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const SettingsPanel = ({
  voicePersona,
  onVoicePersonaChange,
  accentColor,
  onAccentColorChange,
  isDarkMode,
  onThemeToggle,
}: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);

  const accentColors = [
    { name: "Cyan", value: "180 100% 50%", hex: "#00FFFF" },
    { name: "Green", value: "120 100% 50%", hex: "#00FF00" },
    { name: "Pink", value: "330 100% 60%", hex: "#FF33CC" },
    { name: "Purple", value: "280 100% 60%", hex: "#9D00FF" },
    { name: "Orange", value: "30 100% 50%", hex: "#FF9900" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/10 hover:text-accent"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[350px] border-l-2 border-accent/50 bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-accent">Settings</SheetTitle>
          <SheetDescription>
            Customize your voice chat experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-8">
          {/* Theme Toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-accent" />
              ) : (
                <Sun className="w-4 h-4 text-accent" />
              )}
              <Label htmlFor="theme-toggle" className="text-base font-semibold">
                Dark Mode
              </Label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
              </span>
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={onThemeToggle}
              />
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-accent" />
              <Label className="text-base font-semibold">Accent Color</Label>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {accentColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => onAccentColorChange(color.value)}
                  className={`
                    w-12 h-12 rounded-lg border-2 transition-all duration-200
                    ${
                      accentColor === color.value
                        ? "border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110"
                        : "border-transparent hover:scale-105"
                    }
                  `}
                  style={{
                    backgroundColor: color.hex,
                    boxShadow:
                      accentColor === color.value
                        ? `0 0 20px ${color.hex}80`
                        : "none",
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Voice Persona Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" />
              <Label htmlFor="voice-persona" className="text-base font-semibold">
                Voice Persona
              </Label>
            </div>
            <Select value={voicePersona} onValueChange={onVoicePersonaChange}>
              <SelectTrigger
                id="voice-persona"
                className="border-accent/30 focus:ring-accent"
              >
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {voicePersona === "conversational" &&
                "Friendly and casual tone for everyday chats"}
              {voicePersona === "professional" &&
                "Polished and formal for business contexts"}
              {voicePersona === "academic" &&
                "Scholarly and precise for technical discussions"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
