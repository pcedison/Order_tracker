import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      id="confirmDialog" 
      className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[1000] flex items-center justify-center"
    >
      <div className="bg-white p-5 rounded-lg w-[350px] text-center">
        <div id="confirmMessage" className="text-[20px] mb-5">
          {message}
        </div>
        <div className="flex justify-center gap-4">
          <Button
            id="confirmYes"
            onClick={onConfirm}
            className="px-4 py-2.5 text-[22px] bg-[#f44336] text-white border-none rounded cursor-pointer hover:bg-[#d32f2f]"
          >
            確定
          </Button>
          <Button
            id="confirmNo"
            onClick={onCancel}
            className="px-4 py-2.5 text-[22px] bg-[#9e9e9e] text-white border-none rounded cursor-pointer hover:bg-opacity-90"
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
