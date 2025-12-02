import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";

export default function CourseFeedback({enrollmentData}) {
  const [rating, setRating] = useState<number | null>(4);
  const [hover, setHover] = useState<number | null>(null);
  const [selectedButton, setSelectedButton] = useState<number | null>(null);

  const colors = [
    { id: 1, color: "#00CE84" },
    { id: 2, color: "#B28FFF" },
    { id: 3, color: "#6257FF" },
    { id: 4, color: "#00FF91" },
    { id: 5, color: "#FFC229" },
    { id: 6, color: "#6BECFF" },
  ];

  const handleRatingMessage = () => {
    if (rating !== null) {
      if (rating < 3) return "Not Good";
      if (rating === 3) return "Decent";
      if (rating > 3) return "Excellent";
    }
    return "";
  };

  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* Stars card */}
          <div className="flex flex-col items-center justify-center rounded-lg p-6">
            <h1 className="mb-4 text-2xl font-bold">Rate Us</h1>
            <div className="mb-4 flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  className={`text-3xl ${
                    (hover || rating) >= star
                      ? "text-yellow-500"
                      : "text-gray-400"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="text-lg font-semibold">
              {rating !== null ? handleRatingMessage() : "Select a rating"}
            </div>
            {rating && (
              <div className="mt-4 text-sm text-gray-600">
                You rated us {rating} out of 5 stars!
              </div>
            )}
          </div>
          {/* What could be improved? */}
          <div className="mt-10">
            <h2 className="text-center font-semibold">
              What could be improved?
            </h2>
          </div>
          {/* Feedback Card */}
          <div className="mt-6 rounded-lg bg-white p-6">
            <div className="mb-4 flex flex-row items-center justify-center gap-1.5 text-2xl font-bold">
              <MessageSquarePlus size={21} />
              <p>Feedback</p>
            </div>
            <textarea
              className="h-32 w-full rounded-lg border border-gray-300 p-4"
              placeholder="Enter your feedback here..."
            />
          </div>
        </div>

        <Button className="w-full" variant={"purple"}>
          Submit
        </Button>
      </div>
    </PurpleGradient>
  );
}
