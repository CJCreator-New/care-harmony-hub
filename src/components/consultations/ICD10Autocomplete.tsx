import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Loader2, X } from "lucide-react";
import { useICD10Codes } from "@/hooks/useICD10Codes";
import { ICD10Code } from "@/types/icd10";
import { cn } from "@/lib/utils";

interface ICD10AutocompleteProps {
  onSelect: (code: ICD10Code) => void;
  placeholder?: string;
  className?: string;
}

export function ICD10Autocomplete({
  onSelect,
  placeholder = "Search ICD-10 codes...",
  className,
}: ICD10AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: codes, isLoading } = useICD10Codes(searchTerm);

  const handleSelect = (code: ICD10Code) => {
    onSelect(code);
    setSearchTerm("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value.length >= 2) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (searchTerm.length >= 2) {
                setOpen(true);
              }
            }}
            className="pl-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <ScrollArea className="h-[300px]">
          {codes && codes.length > 0 ? (
            <div className="p-1">
              {codes.map((code) => (
                <button
                  key={code.id}
                  onClick={() => handleSelect(code)}
                  className="w-full flex items-start gap-3 p-2 hover:bg-accent rounded-md transition-colors text-left"
                >
                  <Badge variant="outline" className="font-mono shrink-0">
                    {code.code}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {code.short_description}
                    </p>
                    {code.long_description && code.long_description !== code.short_description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {code.long_description}
                      </p>
                    )}
                    {code.category && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {code.category}
                      </p>
                    )}
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No ICD-10 codes found for "{searchTerm}"
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
