import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

const ImageAreaCreator = () => {
  const [image, setImage] = useState(null);
  const [areas, setAreas] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentArea, setCurrentArea] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

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
    if (image) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        calculateImageScale();
        drawImage();
      };
      img.src = URL.createObjectURL(image);
    }
  }, [image, canvasSize]);

  const calculateImageScale = () => {
    if (imageRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const scaleX = canvasSize.width / imageRef.current.width;
      const scaleY = canvasSize.height / imageRef.current.height;
      setScale(Math.min(scaleX, scaleY));
    }
  };

  const handleImageUpload = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
      setAreas([]);
    }
  };

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      const scaledWidth = imageRef.current.width * scale;
      const scaledHeight = imageRef.current.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      ctx.drawImage(imageRef.current, x, y, scaledWidth, scaledHeight);
    }

    drawAreas();
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentArea({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    });
    drawImage();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !image) return;
    setIsDrawing(false);
    if (currentArea) {
      setAreas([...areas, currentArea]);
      setCurrentArea(null);
    }
    drawImage();
  };

  const drawAreas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    [...areas, currentArea].filter(Boolean).forEach((area, index) => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(area.x, area.y, area.width, area.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(area.x, area.y, area.width, area.height);
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(index + 1, area.x + 5, area.y + 20);
    });
  };

  const generateCode = () => {
    return JSON.stringify(areas);
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Image Area Creator</h1>
      <div className="mb-4">
        <Input type="file" onChange={handleImageUpload} accept="image/*" />
      </div>
      <div ref={containerRef} className="w-80">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-gray-300"
        />
      </div>
      {areas.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-xl font-semibold">Generated mapAreas:</h2>
          <pre className="rounded bg-gray-100 p-4">{generateCode()}</pre>
        </div>
      )}
      {!image && (
        <div className="mt-4 text-center text-gray-500">
          <Upload className="mx-auto h-12 w-12" />
          <p>Upload an image to start creating clickable areas</p>
        </div>
      )}
    </div>
  );
};

export default ImageAreaCreator;
