/**
 * Duplicate Palette dialog.
 * Lets users create a copy of the current palette with a custom name.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CopyPlus } from 'lucide-react';

interface DuplicateDialogProps {
  currentName: string;
  onDuplicate: (name: string) => void;
  /** Render as icon-only on mobile */
  compact?: boolean;
  /** External open state — used by overflow menu */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If true, don't render a trigger button (external trigger handles it) */
  hideTrigger?: boolean;
}

export function DuplicateDialog({
  currentName,
  onDuplicate,
  compact,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: DuplicateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [name, setName] = useState(`${currentName} Copy`);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Reset fields when opening
      setName(`${currentName} Copy`);
    }
    setOpen(next);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onDuplicate(trimmed);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-[11px] gap-1"
            aria-label="Duplicate palette"
          >
            <CopyPlus className="w-3 h-3" />
            {!compact && 'Duplicate'}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Duplicate Palette</DialogTitle>
          <DialogDescription>
            Create a copy of the current palette with a new name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dup-name" className="text-[13px]">Palette Name</Label>
            <Input
              id="dup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className="h-8 text-[13px]"
              placeholder="e.g. Carmine Copy"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="text-[13px]">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={!name.trim()} className="text-[13px]">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
