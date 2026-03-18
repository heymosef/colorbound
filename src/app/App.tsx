import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';
import { PaletteProvider } from './lib/palette-context';
import { TooltipProvider } from './components/ui/tooltip';
import { AriaLiveAnnouncer } from './components/aria-live-announcer';

export default function App() {
  return (
    <PaletteProvider>
      <TooltipProvider delayDuration={300}>
        <AriaLiveAnnouncer>
          <RouterProvider router={router} />
          <Toaster position="bottom-center" />
        </AriaLiveAnnouncer>
      </TooltipProvider>
    </PaletteProvider>
  );
}