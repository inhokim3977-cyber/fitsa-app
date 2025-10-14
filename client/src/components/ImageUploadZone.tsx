import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadZoneProps {
  label: string;
  description: string;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  selectedImage: File | null;
  previewUrl: string | null;
  className?: string;
  testId?: string;
}

export function ImageUploadZone({
  label,
  description,
  onImageSelect,
  onImageRemove,
  selectedImage,
  previewUrl,
  className,
  testId,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile) {
        onImageSelect(imageFile);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          {label}
        </h3>
        {selectedImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onImageRemove}
            className="h-8"
            data-testid={`${testId}-remove`}
          >
            <X className="h-4 w-4 mr-1" />
            제거
          </Button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all overflow-hidden",
          isDragging
            ? "border-primary bg-primary/5 scale-105"
            : "border-border bg-card",
          selectedImage ? "aspect-square" : "aspect-[4/3]"
        )}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              data-testid={`${testId}-preview`}
            />
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-8 hover-elevate active-elevate-2"
            data-testid={testId}
          >
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileInput}
              data-testid={`${testId}-input`}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                {label.includes("본인") ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-medium text-foreground">
                  드래그 앤 드롭 또는 클릭
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {description}
                </p>
              </div>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
