import { useEffect, useRef, useState } from "react";
interface InteractiveImageQuizProps {
  imageSrc: string;
  mapAreas: {
    x: number;
    y: number;
    width: number;
    height: number;
    id: number;
  }[];
  correctArea: number;
  setAnswer: (answer: number) => void;
}

export const InteractiveImageQuiz = ({
  imageSrc,
  mapAreas,
  setAnswer,
}: InteractiveImageQuizProps) => {
  type CanvasSize = { width: number; height: number };
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = width * (9 / 16);
        setCanvasSize({ width, height });
      }
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
    }
  }, [imageSrc]);

  useEffect(() => {
    if (imageLoaded && canvasSize.width > 0 && canvasSize.height > 0) {
      drawImage();
    }
  }, [imageLoaded, canvasSize]);

  const drawImage = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      const imgAspectRatio = imageRef.current.width / imageRef.current.height;
      const canvasAspectRatio = canvas.width / canvas.height;

      let renderWidth, renderHeight, offsetX, offsetY;

      if (imgAspectRatio > canvasAspectRatio) {
        renderWidth = canvas.width;
        renderHeight = canvas.width / imgAspectRatio;
        offsetX = 0;
        offsetY = (canvas.height - renderHeight) / 2;
      } else {
        renderHeight = canvas.height;
        renderWidth = canvas.height * imgAspectRatio;
        offsetX = (canvas.width - renderWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(
        imageRef.current,
        offsetX,
        offsetY,
        renderWidth,
        renderHeight,
      );
    }
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const clickedArea = mapAreas.find((area) => {
      const { x, y, width, height } = area;
      console.log(area, canvasX, canvasY, "HUUU");
      return (
        canvasX >= x &&
        canvasX <= x + width &&
        canvasY >= y &&
        canvasY <= y + height
      );
    });

    if (clickedArea) {
      setAnswer(clickedArea.id);
    }
    console.log(clickedArea, "CLICKED");
  };

  return (
    <div ref={containerRef} className="w-80">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        className="cursor-pointer border border-gray-300"
      />
    </div>
  );
};
