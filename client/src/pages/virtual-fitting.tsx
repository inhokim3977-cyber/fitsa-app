import { useState, useRef } from 'react';

export default function VirtualFitting() {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [clothesImage, setClothesImage] = useState<File | null>(null);
  const [hatImage, setHatImage] = useState<File | null>(null);
  const [glassesImage, setGlassesImage] = useState<File | null>(null);
  const [shoesImage, setShoesImage] = useState<File | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        if (type === 'person') {
          setPersonImage(file);
          setBeforeUrl(url);
        } else if (type === 'clothes') setClothesImage(file);
        else if (type === 'hat') setHatImage(file);
        else if (type === 'glasses') setGlassesImage(file);
        else if (type === 'shoes') setShoesImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!personImage || !clothesImage) {
      alert('사람 사진과 옷 사진을 모두 업로드해주세요!');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('userPhoto', personImage);
    formData.append('clothingPhoto', clothesImage);
    formData.append('removeBackground', removeBg.toString());

    try {
      const response = await fetch('http://localhost:5001/api/virtual-fitting', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.error) {
        alert('오류: ' + data.error);
      } else {
        setResultUrl(data.resultUrl);
      }
    } catch (error: any) {
      alert('피팅 생성 중 오류: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const FileDropZone = ({ id, type, emoji, label }: any) => (
    <div className="relative">
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, type)}
        className="hidden"
      />
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center cursor-pointer border-3 border-dashed border-white/30 rounded-2xl p-6 transition-all hover:border-white/60 hover:scale-105 backdrop-blur-md bg-white/10"
      >
        <span className="text-5xl mb-2">{emoji}</span>
        <span className="text-white text-sm">{label}</span>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">✨ AI 가상 피팅 스튜디오 ✨</h1>
          <p className="text-white text-lg opacity-90">중앙에 사진을 올리고, 주변에서 스타일을 선택하세요</p>
        </div>

        <div className="flex justify-center items-center mb-20">
          <div className="relative" style={{ width: '700px', height: '700px' }}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {/* Center */}
              <FileDropZone id="person" type="person" emoji="🧑" label="나의 사진" />
              
              {/* Hat - Top */}
              <div className="absolute" style={{ top: '-180px', left: '50%', transform: 'translateX(-50%)' }}>
                <FileDropZone id="hat" type="hat" emoji="🎩" label="모자" />
              </div>
              
              {/* Glasses - Right */}
              <div className="absolute" style={{ top: '50%', right: '-180px', transform: 'translateY(-50%)' }}>
                <FileDropZone id="glasses" type="glasses" emoji="👓" label="안경" />
              </div>
              
              {/* Clothes - Bottom */}
              <div className="absolute" style={{ bottom: '-180px', left: '50%', transform: 'translateX(-50%)' }}>
                <FileDropZone id="clothes" type="clothes" emoji="👔" label="옷" />
              </div>
              
              {/* Shoes - Left */}
              <div className="absolute" style={{ top: '50%', left: '-180px', transform: 'translateY(-50%)' }}>
                <FileDropZone id="shoes" type="shoes" emoji="👟" label="신발" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <label className="inline-flex items-center cursor-pointer bg-white/20 px-6 py-3 rounded-full backdrop-blur-md">
            <input
              type="checkbox"
              checked={removeBg}
              onChange={(e) => setRemoveBg(e.target.checked)}
              className="mr-3 w-5 h-5"
            />
            <span className="text-white font-medium">✨ 배경 자동 제거</span>
          </label>
        </div>

        <div className="text-center mb-12">
          <button
            onClick={handleGenerate}
            disabled={!personImage || !clothesImage || isLoading}
            className="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-2xl"
          >
            {isLoading ? '생성 중...' : '🎨 가상 피팅 생성하기'}
          </button>
        </div>

        {resultUrl && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-white text-center mb-8">✨ Before / After ✨</h2>
            <div className="relative max-w-4xl mx-auto bg-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
              <img src={beforeUrl || ''} alt="Before" className="w-full" />
              <div className="absolute top-0 left-0 w-full h-full" style={{ clipPath: `inset(0 0 0 ${sliderValue}%)` }}>
                <img src={resultUrl} alt="After" className="w-full h-full object-cover" />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-80"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
