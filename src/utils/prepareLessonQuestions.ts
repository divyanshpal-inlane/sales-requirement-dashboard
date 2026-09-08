import type { QuestionGame } from "@/components/lesson/trivia";

/** Shuffle once per quiz attempt, keeping the correct answer tied to its text. */
export function prepareLessonQuestions(
  questions: QuestionGame["games"],
  random: () => number = Math.random,
): QuestionGame["games"] {
  return questions.map((question) => {
    const options = question.answers.map((text, index) => ({ text, index }));
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      ...question,
      answers: options.map((option) => option.text),
      correctAnswer:
        options.findIndex(
          (option) => option.index === question.correctAnswer - 1,
        ) + 1,
    };
  });
}
