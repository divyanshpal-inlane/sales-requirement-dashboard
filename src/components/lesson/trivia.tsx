import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const TriviaCard = () => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const question = "While reversing, how can we maintain control of the car?";
  const answers = [
    "Just use the mirror",
    "Use the clutch and brake pedals to control speed, and look back",
  ];
  const correctAnswerIndex = 1;

  const handleAnswerClick = (index) => {
    setSelectedAnswer(index);
    setShowResult(true);
  };

  const isCorrect = selectedAnswer === correctAnswerIndex;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Trivia Time</h2>
        <p className="mb-4 text-lg">{question}</p>
        {answers.map((answer, index) => (
          <label
            key={index}
            className={`highlighted-text mb-3 flex w-full items-center text-left`}
          >
            <input
              type="checkbox"
              checked={selectedAnswer === index}
              onChange={() => handleAnswerClick(index)}
              className="mr-3"
            />
            {answer}
          </label>
        ))}
        {showResult && (
          <div
            className={`mt-4 rounded-lg p-4 ${isCorrect ? "bg-green-100" : "bg-red-100"} flex items-center`}
          >
            {isCorrect ? (
              <CheckCircle2 className="mr-2 text-green-600" />
            ) : (
              <AlertCircle className="mr-2 text-red-600" />
            )}
            <span className={isCorrect ? "text-green-600" : "text-red-600"}>
              {isCorrect ? "You are correct" : "Incorrect, try again"}
            </span>
          </div>
        )}
        {showResult && (
          <button
            onClick={() => {
              setSelectedAnswer(null);
              setShowResult(false);
            }}
            className="mt-4 w-full rounded-lg bg-emerald-500 py-2 text-white transition-colors hover:bg-emerald-600"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default TriviaCard;
