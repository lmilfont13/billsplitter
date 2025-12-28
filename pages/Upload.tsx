
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, UploadCloud, FileImage, Loader2, Zap } from 'lucide-react';
import { parseReceiptWithGemini } from '../services/geminiService';
import { Button } from '../components/Button';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFile = async (file: File) => {
    setIsLoading(true);
    
    // Convert to Base64 for the API
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      // Remove data URL prefix for API
      const base64Data = base64String.split(',')[1];
      
      try {
        const result = await parseReceiptWithGemini(base64Data);
        // Navigate to review with the parsed data state
        navigate('/review', { 
            state: { 
                items: result.items, 
                image: base64String,
                establishment: result.establishment,
                date: result.date
            } 
        });
      } catch (error) {
        console.error("Failed to parse", error);
        setIsLoading(false);
      }
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 flex-1 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-white">Vamos dividir a conta!</h1>
          <p className="text-gray-400 text-lg">Envie uma foto do recibo para começar a dividir com seus amigos.</p>
        </div>

        {/* Main Upload Area */}
        <div 
          className={`
            relative flex flex-col items-center justify-center gap-6 p-12 rounded-2xl border-2 border-dashed transition-all
            bg-surface-dark/50 cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border-dark hover:border-primary/50 hover:bg-surface-dark'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleFileChange}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <Loader2 className="size-16 text-primary animate-spin" />
              <p className="text-xl font-bold text-white">Analisando recibo com IA...</p>
              <p className="text-sm text-gray-400">Identificando estabelecimento, data e itens...</p>
            </div>
          ) : (
            <>
              <div className="size-20 rounded-full bg-background-dark border border-border-dark flex items-center justify-center shadow-lg">
                <UploadCloud className="size-10 text-primary" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Arraste e solte a imagem aqui ou clique</h3>
                <p className="text-gray-500">Suporta: JPG, PNG, WEBP</p>
              </div>

              <Button>Escolher Arquivo</Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border-dark"></div>
          <span className="text-sm font-medium text-gray-500 uppercase">OU</span>
          <div className="h-px flex-1 bg-border-dark"></div>
        </div>

        {/* Camera Option */}
        <div className="flex justify-center">
            <Button 
                variant="outline" 
                className="w-full max-w-sm gap-2"
                onClick={() => fileInputRef.current?.click()}
            >
                <Camera className="size-5" />
                Escanear com Câmera
            </Button>
        </div>

        <div className="bg-primary/10 rounded-lg p-4 flex items-start gap-3 border border-primary/20">
            <Zap className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
                <h4 className="text-sm font-bold text-white mb-1">Inteligência Artificial</h4>
                <p className="text-xs text-gray-400">Usamos IA avançada para reconhecer automaticamente itens, preços e o local da compra.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
