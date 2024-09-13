import {ArrowLeft} from "lucide-react";
import { useParams } from "react-router";
import invariant from "tiny-invariant";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LESSONS } from "@/constants/lessons";

export default function Lesson() {
  const { lessonId } = useParams();
  invariant(typeof lessonId === "string", "LessonId is required");

  if (lessonId !== "lesson1") {
    return <p className="p-6 text-center">Lesson does not exist</p>;
  }
  const lesson = LESSONS[lessonId];

  return (
    <div className="flex h-full flex-col gap-4 overflow-x-auto">
      {/* Image and LessonInfo */}
      <div className="relative h-2/5 w-full">
        <img
          src="/assets/lesson1.png"
          alt="Car dashboard"
          className="h-full w-full object-fill"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50">
          <div className="flex h-full w-fit flex-col gap-2 bg-[#636363] bg-opacity-70 p-4 text-white">
            <Button
              variant={"ghost"}
              size="icon"
              className="text-primary-foreground"
            >
              <ArrowLeft />
            </Button>
            <div className="my-auto flex flex-col gap-2">
              <h1 className="mb-2 font-semibold">Lesson 1</h1>
              <div className="flex flex-col gap-0 text-xs">
                <p className="text-sm">Date, Time</p>
                <p>XXXXXX</p>
              </div>
              <div className="flex flex-col justify-between gap-0">
                <p className="text-sm">Instructor Name</p>
                <p className="text-xs">XXXXXX</p>
              </div>
              <div className="flex flex-col justify-between gap-0">
                <p className="text-sm">Pick Up location</p>
                <p className="text-xs">XXXXXX</p>
              </div>
              <div className="flex flex-col justify-between gap-0">
                <p className="text-sm">Car Model</p>
                <p className="text-xs">XXXXXX</p>
              </div>
              <div className="flex flex-col justify-between gap-0">
                <p className="text-sm">Car Number</p>
                <p className="text-xs">XXXXXX</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex grow flex-col gap-2 px-6 pb-6">
        {/* Header */}
        <h2 className="text-xl font-semibold">
          You will be good at Starting &amp; Stopping the Car
        </h2>

        {/* normal pointers */}
        <div className="space-y-4">
          {lesson.topPoints.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-center space-x-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/50 text-2xl">
                {item.icon}
              </div>
              <div className="w-2/5">
                <h3 className="font-semibold text-accent-purple">
                  {item.title}
                </h3>
                <p className="text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* card */}
        <Card className="my-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-accent-purple">
              Things to Remember
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {lesson.cardPoints.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl">
                  {item.icon}
                </div>
                <div className="w-4/5">
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reschedule button */}
        <Button
          className="y-4 sticky bottom-4 mt-auto w-full"
          variant={"purple"}
        >
          Reschedule
        </Button>
      </div>
    </div>
  );
}
