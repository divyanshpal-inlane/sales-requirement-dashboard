import React, {
  MouseEvent,
  TouchEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { Checkbox } from "@/components/ui/checkbox";

import signatureIn from "../../../public/assets/signature-in.png";
import signatureOut from "../../../public/assets/signature-out.png";

const Signature: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Resize canvas to match the display size
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const canvasRect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save current drawing
      const dataUrl = canvas.toDataURL();

      // Adjust for device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasRect.width * dpr;
      canvas.height = canvasRect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear and redraw the saved image
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasRect.width, canvasRect.height);
      };
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Get canvas coordinates based on mouse or touch events
  const getCanvasCoordinates = (
    event: MouseEvent | TouchEvent,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in event) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  // Start drawing
  const startDrawing = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);
    setIsDrawing(true);
    setLastPoint({ x, y });
  };

  // Draw on the canvas
  const draw = (event: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Set drawing styles
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.lineCap = "round";

    // Draw line from last point to current point
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(x, y);
    context.stroke();

    setLastPoint({ x, y });
  };

  // End drawing
  const endDrawing = (event: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    setIsDrawing(false);
  };

  // Clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center gap-8 bg-[#00CE84] p-4">
      {/* Header */}
      {/* <div className="flex flex-row items-center justify-center gap-4 p-4 text-center">
        <p className="text-4xl">Autograph Please</p>
        <p className="text-5xl">✏️</p>
      </div> */}

      {/* Image and Canvas Container */}
      <div
        className="relative flex w-full max-w-md flex-col items-center justify-center gap-4 sm:max-w-lg md:max-w-xl lg:max-w-2xl"
        ref={containerRef}
      >
        {/* Outer Image */}
        <img src={signatureOut} alt="Outer" className="h-auto w-full" />

        {/* Heading Inside Outer Image Above Inner Image */}
        <h2 className="absolute left-4 top-[5%] transform px-4 text-center text-xl text-accent-purple">
          You've got all the skills—time to show off everything you learnt
        </h2>

        {/* Inner Image */}
        <img
          src={signatureIn}
          alt="Inner"
          className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-3/4 -translate-x-1/2 -translate-y-1/2 transform"
        />

        {/* Canvas for Signature */}
        <canvas
          ref={canvasRef}
          className="absolute left-1/2 top-[60%] h-[18%] w-[70%] -translate-x-1/2 -translate-y-1/2 transform bg-transparent"
          style={{ touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />

        {/* Text Inside Outer Image Below Inner Image */}
        <div className="text-md absolute bottom-[15%] left-1/2 w-3/4 -translate-x-1/2 transform text-center text-accent-purple">
          <div className="flex flex-row items-center justify-center gap-3">
            <Checkbox /> <p>I agree to uphold this pledge.</p>
          </div>
        </div>
      </div>

      {/* Clear Button */}
      <div className="flex flex-row justify-center gap-8">
        <button
          onClick={clearCanvas}
          className="mt-4 rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
        >
          Clear Signature
        </button>
        {/* <button className="hover:bg-accent-purple-dark mt-4 rounded bg-accent-purple px-4 py-2 text-white transition-colors">
          Submit
        </button> */}
      </div>
    </div>
  );
};

export default Signature;
