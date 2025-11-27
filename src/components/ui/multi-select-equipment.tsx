'use client';

import * as React from 'react';
import { X, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getEquipmentByCategory } from '@/lib/equipment-list';

interface MultiSelectEquipmentProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectEquipment({
  selected,
  onChange,
  placeholder = 'Select equipment...',
  disabled = false,
}: MultiSelectEquipmentProps) {
  const [open, setOpen] = React.useState(false);
  const equipmentCategories = getEquipmentByCategory();

  const handleToggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const handleRemove = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] py-2"
            disabled={disabled}
          >
            <div className="flex items-center gap-1 flex-wrap">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <span className="text-sm">
                  {selected.length} item{selected.length > 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search equipment..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No equipment found.</CommandEmpty>
              {equipmentCategories.map((category, categoryIndex) => (
                <React.Fragment key={category.category}>
                  <CommandGroup heading={category.category}>
                    {category.items.map((item) => {
                      const isSelected = selected.includes(item);
                      return (
                        <CommandItem
                          key={item}
                          onSelect={() => handleToggle(item)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggle(item)}
                              className="pointer-events-none"
                            />
                            <span className={cn(isSelected && 'font-medium')}>
                              {item}
                            </span>
                            {isSelected && (
                              <Check className="ml-auto h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {categoryIndex < equipmentCategories.length - 1 && (
                    <CommandSeparator />
                  )}
                </React.Fragment>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
          <div className="flex items-center gap-1 flex-wrap w-full">
            {selected.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="gap-1 pr-1 hover:bg-secondary/80"
              >
                <span className="text-xs">{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selected.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs ml-auto"
                disabled={disabled}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
