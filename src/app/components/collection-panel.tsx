import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Download,
  Contrast,
} from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { ExportPanel } from './export-panel';
import { ContrastPairSelector } from './contrast-indicator';
import { track } from '../lib/analytics';

interface RightPanelProps {
  collection: Palette[];
  currentPalette: Palette | null;
  /** When true, renders content without the Card wrapper (for inline tab usage) */
  inlineMode?: boolean;
  /** Default tab to show in inline mode */
  defaultTab?: 'a11y' | 'export';
  /** When true, the panel fills a fixed-height sidebar and manages its own scroll. */
  fillHeight?: boolean;
}

export function CollectionPanel({
  collection,
  currentPalette,
  inlineMode,
  defaultTab,
  fillHeight = true,
}: RightPanelProps) {
  // Inline mode: render just the requested content without card/tabs wrapper
  if (inlineMode) {
    if (defaultTab === 'export') {
      return <ExportPanel inlineMode />;
    }
    return <ContrastPairSelector palette={currentPalette} inlineMode />;
  }

  // Default card mode (desktop right sidebar)
  return (
    <Card className={`${fillHeight ? 'h-full' : ''} border-0 rounded-none shadow-none bg-card gap-0`}>
      <Tabs defaultValue="a11y" className={`${fillHeight ? 'h-full' : ''} flex flex-col`} onValueChange={(v) => {
        if (v === 'export') track('export_panel_opened');
      }}>
        <CardHeader className="pb-0 px-4 pt-4 shrink-0">
          <div className="flex gap-2">
            <TabsList className="w-full h-9 p-0.5">
              <TabsTrigger value="a11y" className="text-[12px] flex-1 h-full gap-1.5">
                <Contrast className="w-3.5 h-3.5" />
                Accessibility
              </TabsTrigger>
              <TabsTrigger value="export" className="text-[12px] flex-1 h-full gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Export
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent
          className={`${fillHeight ? 'flex-1 min-h-0' : ''} px-4 pt-3 min-w-0`}
          style={{ paddingBottom: fillHeight ? 0 : 16 }}
        >
          {fillHeight ? (
            <>
              <TabsContent value="a11y" className="h-full mt-0 min-w-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <ContrastPairSelector palette={currentPalette} inlineMode />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="export" className="h-full mt-0 min-w-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="py-1 px-1">
                    <ExportPanel inlineMode />
                  </div>
                </ScrollArea>
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="a11y" className="mt-0 min-w-0">
                <ContrastPairSelector palette={currentPalette} inlineMode />
              </TabsContent>

              <TabsContent value="export" className="mt-0 min-w-0">
                <div className="py-1 px-1">
                  <ExportPanel inlineMode />
                </div>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
