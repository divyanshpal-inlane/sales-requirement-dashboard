import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { InteractiveImageQuiz, QuestionQuiz } from "@/components/lesson/quiz";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PaintedText } from "@/components/ui/paint-text";

export type ImageGame = {
  type: "image";
  games: {
    mapAreas: {
      x: number;
      y: number;
      width: number;
      height: number;
      id: number;
    }[];
    correctAnswer: number;
    imageSrc: string;
    question: string;
  }[];
};

export type QuestionGame = {
  type: "question";
  games: {
    question: string;
    answers: string[];
    correctAnswer: number;
  }[];
};

export type Game = ImageGame | QuestionGame;
export type GameType = Game["type"];

const gameToTriviaMap: Record<GameType, any> = {
  image: InteractiveImageQuiz,
  question: QuestionQuiz,
};

const TriviaCard = ({
  finishGame,
  game: { type: gameType, games: game },
}: {
  finishGame: () => void;
  game: Game;
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(
    undefined,
  );
  const [gameIndex, setGameIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const isCorrect = selectedAnswer === game[gameIndex].correctAnswer;

  useEffect(() => {
    if (timeLeft === 0) {
      setShowTimeUpDialog(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    // Reset timer when moving to next question
    setTimeLeft(15);
  }, [gameIndex]);

  const Comp = gameToTriviaMap[gameType];
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 p-6">
            <h2 className="text-2xl font-bold text-destructive">Time's Up!</h2>
            <p className="text-center text-gray-600">
              You ran out of time for this question.
            </p>
            <Button
              onClick={() => {
                setShowTimeUpDialog(false);
                if (gameIndex + 1 >= game.length) {
                  finishGame();
                } else {
                  setGameIndex((prev) => prev + 1);
                  setSelectedAnswer(undefined);
                }
              }}
              className="w-full"
            >
              {gameIndex + 1 >= game.length ? "Finish Game" : "Next Question"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative flex aspect-[2/3] w-full max-w-sm flex-col justify-center rounded-[30px] bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.19),_0_6px_6px_rgba(0,0,0,0.23)] transition-all duration-300 hover:shadow-[0_14px_28px_rgba(0,0,0,0.25),_0_10px_10px_rgba(0,0,0,0.22)]">
        <div
          className="absolute -left-4 top-14 -m-2 p-2 text-2xl font-light z-10 text-white text-center"
          style={{
            backgroundImage: "url(/public/assets/trivia-tag.png)",
            backgroundSize: "cover",
            width: "70%",
            
          }}
        >
          Trivia time
        </div>
        <PaintedText
          className={`absolute right-6 top-14 text-lg ${timeLeft <= 5 ? "text-destructive" : "text-black"}`}
        >
          <span className="text-2xl">⏰</span>
          {timeLeft} secs
        </PaintedText>
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-gray-400 bg-white p-2 font-brico shadow-inner">
          {gameType === "image" ? (
            <p className="mb-6 font-glancyr text-accent-purple">
              {game[gameIndex].question}
            </p>
          ) : null}
          <Comp
            key={game[gameIndex].imageSrc}
            setSelectedAnswer={setSelectedAnswer}
            selectedAnswer={selectedAnswer}
            game={game[gameIndex]}
          />
          {gameType === "image" ? (
            <p className="mt-1 w-full px-4 text-start font-glancyr text-base">
              Click on the image to input your answer
            </p>
          ) : null}
          <AnimatePresence>
            {selectedAnswer && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`absolute bottom-0 left-0 right-0 p-4 font-glancyr ${
                  isCorrect
                    ? "bg-primary/30 text-primary"
                    : "bg-destructive/30 text-destructive"
                } flex flex-col items-start gap-2 rounded-t-[32px] shadow-lg`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {isCorrect ? "You are correct" : "Incorrect, try again"}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    if (!isCorrect) return;
                    if (gameIndex + 1 >= game.length) {
                      finishGame();
                    } else setGameIndex((gameIndex) => gameIndex + 1);

                    setSelectedAnswer(undefined);
                  }}
                  className="w-full"
                  variant={isCorrect ? "default" : "destructive"}
                >
                  Continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TriviaCard;
