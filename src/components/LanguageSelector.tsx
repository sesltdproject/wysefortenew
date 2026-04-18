import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation, languages, LanguageCode } from "@/i18n";

interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'full' | 'auth';
  transparent?: boolean;
  className?: string;
}

export const LanguageSelector = ({ variant = 'header', transparent = false, className = '' }: LanguageSelectorProps) => {
  const { language, setLanguage, t } = useTranslation();

  const currentLanguage = languages.find(l => l.code === language);

  if (variant === 'compact') {
    return (
      <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
        <SelectTrigger className={`w-auto gap-2 border-primary/20 bg-background/80 backdrop-blur-sm ${className}`}>
          <Globe className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{currentLanguage?.flag}</span>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-[100]">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'auth') {
    return (
      <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
        <SelectTrigger className={`w-auto gap-2 border-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors ${className}`}>
          <Globe className="h-4 w-4 text-primary" />
          <span>{currentLanguage?.flag}</span>
          <span className="hidden sm:inline text-sm font-medium text-primary">{currentLanguage?.nativeName}</span>
        </SelectTrigger>
        <SelectContent className="bg-white border shadow-xl z-[100]">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="cursor-pointer hover:bg-primary/5">
              <span className="flex items-center gap-3">
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-muted-foreground text-sm">({lang.name})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'full') {
    return (
      <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
        <SelectTrigger className={`w-full gap-2 border-primary/20 ${className}`}>
          <Globe className="h-4 w-4 text-primary" />
          <span>{currentLanguage?.flag}</span>
          <span>{currentLanguage?.nativeName}</span>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-[100]">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
              <span className="flex items-center gap-3">
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-muted-foreground text-sm">({lang.name})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default header variant
  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
      <SelectTrigger className={`w-auto gap-2 border-none bg-transparent transition-colors shadow-none ${transparent ? 'hover:bg-white/10 text-white [&>svg]:text-white' : 'hover:bg-primary/5'} ${className}`}>
        <Globe className={`h-4 w-4 ${transparent ? 'text-white' : 'text-primary'}`} />
        <span>{currentLanguage?.flag}</span>
        <span className={`hidden lg:inline text-sm font-medium ${transparent ? 'text-white/90' : 'text-slate-600'}`}>{currentLanguage?.nativeName}</span>
      </SelectTrigger>
      <SelectContent className="bg-white border shadow-xl z-[100]">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="cursor-pointer hover:bg-primary/5">
            <span className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-muted-foreground text-sm">({lang.name})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
