import { useTranslation } from "react-i18next";
import { Translate } from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const change = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("dh_lang", lng);
  };
  const current = i18n.language?.startsWith("hi") ? "हिन्दी" : "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 text-xs tracking-widest uppercase text-[#F4EFE6] hover:opacity-100 opacity-90" data-testid="lang-switcher">
        <Translate size={14} weight="duotone" />
        {compact ? (current === "English" ? "EN" : "HI") : current}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white" align="end">
        <DropdownMenuItem onClick={() => change("en")} data-testid="lang-en">English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => change("hi")} data-testid="lang-hi">हिन्दी</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
