import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BeforeAfterComparisonProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export function BeforeAfterComparison({
  beforeImage,
  afterImage,
  className,
}: BeforeAfterComparisonProps) {
  return (
    <div className={cn("grid md:grid-cols-2 gap-6", className)}>
      <div className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          원본 사진
        </h3>
        <Card className="overflow-hidden aspect-square">
          <img
            src={beforeImage}
            alt="Original"
            className="w-full h-full object-cover"
            data-testid="image-before"
          />
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          가상 피팅 결과
        </h3>
        <Card className="overflow-hidden aspect-square">
          <img
            src={afterImage}
            alt="Virtual Fitting Result"
            className="w-full h-full object-cover"
            data-testid="image-after"
          />
        </Card>
      </div>
    </div>
  );
}
