import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  message?: string;
  estimatedTime?: string;
}

export function ProgressIndicator({
  message = "AI가 이미지를 합성하고 있습니다...",
  estimatedTime = "약 10-15초 소요",
}: ProgressIndicatorProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-base font-medium text-foreground">{message}</p>
      </div>
      <div className="space-y-2 max-w-md mx-auto">
        <Progress value={undefined} className="h-2" data-testid="progress-bar" />
        <p className="text-xs text-center text-muted-foreground">
          {estimatedTime}
        </p>
      </div>
    </div>
  );
}
