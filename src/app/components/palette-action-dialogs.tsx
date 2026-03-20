import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { DuplicateDialog } from './duplicate-dialog';
import { SharePaletteButton } from './share/share-actions';
import type { Palette } from '../lib/color-utils';

interface PaletteActionDialogsProps {
  palette: Palette;
  dupOpen: boolean;
  shareOpen: boolean;
  deleteOpen: boolean;
  onDuplicate?: (name: string) => void;
  onDelete?: () => void;
  onDupOpenChange: (open: boolean) => void;
  onShareOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  paletteName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  paletteName: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete palette?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove &ldquo;{paletteName}&rdquo; from your collection. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-[13px]">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="text-[13px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaletteActionDialogs({
  palette,
  dupOpen,
  shareOpen,
  deleteOpen,
  onDuplicate,
  onDelete,
  onDupOpenChange,
  onShareOpenChange,
  onDeleteOpenChange,
}: PaletteActionDialogsProps) {
  return (
    <>
      {onDuplicate && (
        <DuplicateDialog
          currentName={palette.name}
          onDuplicate={onDuplicate}
          open={dupOpen}
          onOpenChange={onDupOpenChange}
          hideTrigger
        />
      )}

      <SharePaletteButton
        palette={palette}
        open={shareOpen}
        onOpenChange={onShareOpenChange}
        hideTrigger
      />

      {deleteOpen && onDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={onDeleteOpenChange}
          onConfirm={() => {
            onDelete();
            onDeleteOpenChange(false);
          }}
          paletteName={palette.name}
        />
      )}
    </>
  );
}
