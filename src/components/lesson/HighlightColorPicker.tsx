import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Highlighter } from 'lucide-react';

interface HighlightColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fbbf24' },
  { name: 'Green', value: '#4ade80' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Cyan', value: '#22d3d8' },
  { name: 'Red', value: '#f87171' },
];

export const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  currentColor,
  onColorChange,
}) => {
  const { t } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Highlighter className="h-4 w-4" style={{ color: currentColor }} />
          {t('lesson.highlightColor')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <p className="text-sm font-medium mb-2 text-foreground">{t('lesson.chooseColor')}</p>
        <div className="grid grid-cols-4 gap-2">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                currentColor === color.value ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};