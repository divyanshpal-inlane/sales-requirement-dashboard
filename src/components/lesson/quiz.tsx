import { useEffect, useRef, useState } from "react";

import { ImageGame, QuestionGame } from "@/components/lesson/trivia";
import { PaintedText } from "@/components/ui/paint-text";
interface InteractiveImageQuizProps {
  game: ImageGame["games"][number];
  selectedAnswer: number;
  setSelectedAnswer: (answer: number) => void;
}

export const InteractiveImageQuiz = ({
  game: { imageSrc, mapAreas },
  setSelectedAnswer,
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
      setSelectedAnswer(clickedArea.id);
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

export function QuestionQuiz({
  game,
  selectedAnswer,
  setSelectedAnswer,
}: {
  game: QuestionGame["games"][number];
  selectedAnswer: number;
  setSelectedAnswer: (answer: number) => void;
}) {
  const answers = game.answers;
  const question = game.question;
  return (
    <>
      <h3 className="mb-4 text-lg font-bold text-accent-purple">{question}</h3>
      {answers.map((answer, index) => (
        <label
          key={index}
          className={`mb-3 flex w-full items-center text-left font-semibold`}
        >
          <input
            type="radio"
            checked={selectedAnswer ? selectedAnswer - 1 === index : false}
            onChange={() => setSelectedAnswer(index + 1)}
            className="mr-3"
          />
          <PaintedText
            variant={
              selectedAnswer && selectedAnswer - 1 === index
                ? selectedAnswer === game.correctAnswer
                  ? "green"
                  : "red"
                : null
            }
          >
            {answer}
          </PaintedText>
        </label>
      ))}
    </>
  );
}
