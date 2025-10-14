import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageUploadZone } from "@/components/ImageUploadZone";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Download, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VirtualFitting() {
  const { toast } = useToast();
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [clothingPhoto, setClothingPhoto] = useState<File | null>(null);
  const [clothingPhotoPreview, setClothingPhotoPreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleUserPhotoSelect = useCallback((file: File) => {
    setUserPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClothingPhotoSelect = useCallback((file: File) => {
    setClothingPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setClothingPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUserPhotoRemove = useCallback(() => {
    setUserPhoto(null);
    setUserPhotoPreview(null);
  }, []);

  const handleClothingPhotoRemove = useCallback(() => {
    setClothingPhoto(null);
    setClothingPhotoPreview(null);
  }, []);

  const generateFittingMutation = useMutation({
    mutationFn: async () => {
      if (!userPhoto || !clothingPhoto) {
        throw new Error("Both images are required");
      }

      const formData = new FormData();
      formData.append("userPhoto", userPhoto);
      formData.append("clothingPhoto", clothingPhoto);

      const response = await apiRequest("POST", "/api/virtual-fitting", formData) as unknown;
      return response as { id: string; resultUrl: string; status: string };
    },
    onSuccess: (data: { id: string; resultUrl: string; status: string }) => {
      setResultImage(data.resultUrl);
      toast({
        title: "피팅 완료!",
        description: "가상 피팅 결과가 생성되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류 발생",
        description: error.message || "이미지 합성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = useCallback(() => {
    if (!resultImage) return;

    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `virtual-fitting-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "이미지가 저장되었습니다.",
    });
  }, [resultImage, toast]);

  const handleReset = useCallback(() => {
    setUserPhoto(null);
    setUserPhotoPreview(null);
    setClothingPhoto(null);
    setClothingPhotoPreview(null);
    setResultImage(null);
  }, []);

  const canGenerate = userPhoto && clothingPhoto && !generateFittingMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            AI 가상 피팅
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            구매 전에 옷, 모자, 안경을 가상으로 착용해보세요.
            <br />
            AI가 자연스럽게 합성해드립니다.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {!resultImage ? (
            <Card className="p-8">
              <div className="space-y-8">
                {/* Upload Zones */}
                <div className="grid md:grid-cols-2 gap-8">
                  <ImageUploadZone
                    label="본인 사진"
                    description="얼굴이 잘 보이는 정면 사진을 업로드해주세요"
                    onImageSelect={handleUserPhotoSelect}
                    onImageRemove={handleUserPhotoRemove}
                    selectedImage={userPhoto}
                    previewUrl={userPhotoPreview}
                    testId="upload-user-photo"
                  />
                  <ImageUploadZone
                    label="착용할 아이템"
                    description="옷, 모자, 안경 등 착용하고 싶은 아이템 사진"
                    onImageSelect={handleClothingPhotoSelect}
                    onImageRemove={handleClothingPhotoRemove}
                    selectedImage={clothingPhoto}
                    previewUrl={clothingPhotoPreview}
                    testId="upload-clothing-photo"
                  />
                </div>

                {/* Progress or Generate Button */}
                {generateFittingMutation.isPending ? (
                  <ProgressIndicator />
                ) : (
                  <div className="flex justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={() => generateFittingMutation.mutate()}
                      disabled={!canGenerate}
                      className="w-full md:w-auto min-w-[240px]"
                      data-testid="button-generate-fitting"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      가상 피팅 생성하기
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Before/After Comparison */}
              <BeforeAfterComparison
                beforeImage={userPhotoPreview || ""}
                afterImage={resultImage}
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={handleDownload}
                  data-testid="button-download"
                >
                  <Download className="h-5 w-5 mr-2" />
                  결과 다운로드
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-try-another"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  새로운 피팅 시도
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
