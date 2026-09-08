// Run: node --experimental-strip-types --test tests/lesson-trivia.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { LESSON_TRIVIA } from "../src/constants/lessonTrivia.ts";
import { prepareLessonQuestions } from "../src/utils/prepareLessonQuestions.ts";

test("all 60 curriculum questions are allocated to the intended lessons", () => {
  assert.deepEqual(
    Object.keys(LESSON_TRIVIA),
    Array.from({ length: 10 }, (_, i) => String(i + 1)),
  );
  assert.deepEqual(
    Object.values(LESSON_TRIVIA).map((q) => q.games.length),
    [3, 3, 2, 5, 8, 8, 5, 15, 6, 5],
  );
  for (const lesson of Object.values(LESSON_TRIVIA)) {
    assert.equal(lesson.type, "question");
    for (const q of lesson.games) {
      assert.equal(q.answers.length, 4);
      assert.ok(q.correctAnswer >= 1 && q.correctAnswer <= 4);
      assert.ok(q.question.trim());
      assert.ok(q.explanation.trim());
      assert.ok(q.answers.every((a) => a.trim() && !a.includes("✓")));
    }
  }
});

test("shuffling preserves every correct answer and explanation without mutating the bank", () => {
  for (const { games } of Object.values(LESSON_TRIVIA)) {
    const original = structuredClone(games);
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const shuffled = prepareLessonQuestions(games, random);
      shuffled.forEach((q, i) => {
        assert.equal(
          q.answers[q.correctAnswer - 1],
          games[i].answers[games[i].correctAnswer - 1],
        );
        assert.equal(q.explanation, games[i].explanation);
        assert.deepEqual([...q.answers].sort(), [...games[i].answers].sort());
      });
    }
    assert.deepEqual(games, original);
  }
});

test("legacy two-option specialty questions remain supported", () => {
  const original = [
    {
      question: "Example",
      answers: ["Correct", "Incorrect"],
      correctAnswer: 1,
    },
  ];
  const [q] = prepareLessonQuestions(original, () => 0);
  assert.deepEqual(q.answers, ["Incorrect", "Correct"]);
  assert.equal(q.correctAnswer, 2);
});
