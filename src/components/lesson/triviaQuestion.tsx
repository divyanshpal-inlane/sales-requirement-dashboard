import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PaintedText } from "@/components/ui/paint-text";

const TriviaQuestion = ({
  finishGame,
  game,
}: {
  finishGame: () => void;
  game: { question: string; answers: string[]; correctAnswer: number }[];
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(
    undefined,
  );
  const [gameIndex, setGameIndex] = useState(0);
  const question = game[gameIndex].question;
  const answers = game[gameIndex].answers;

  const isCorrect = selectedAnswer === game[gameIndex].correctAnswer;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex aspect-[2/3] w-full max-w-sm flex-col justify-center rounded-[30px] bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.19),_0_6px_6px_rgba(0,0,0,0.23)] transition-all duration-300 hover:shadow-[0_14px_28px_rgba(0,0,0,0.25),_0_10px_10px_rgba(0,0,0,0.22)]">
        <PaintedText
          className="absolute -left-2 top-14 -m-2 p-2 px-4 text-2xl font-light"
          variant={"blue"}
        >
          Trivia time
        </PaintedText>
        <PaintedText className="absolute right-6 top-14 text-lg text-black">
          15 secs <span className="text-2xl">⏰</span>
        </PaintedText>
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-gray-400 bg-white p-2 font-brico shadow-inner">
          <h3 className="mb-4 text-lg font-bold text-accent-purple">
            {question}
          </h3>
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
                    ? selectedAnswer === game[gameIndex].correctAnswer
                      ? "green"
                      : "red"
                    : null
                }
              >
                {answer}
              </PaintedText>
            </label>
          ))}

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
                    if (gameIndex + 1 === game.length) {
                      finishGame();
                    } else setGameIndex((gameIndex) => (gameIndex + 1) % 2);

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

export default TriviaQuestion;
