import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LESSONS } from "@/constants/lessons";
import {
  ArrowLeft,
  Lightbulb,
  ParkingCircle,
  PieChart,
  Smile,
  User2,
} from "lucide-react";
import { useParams } from "react-router";
import invariant from "tiny-invariant";

export default function Lesson() {
  const { lessonId } = useParams();
  invariant(typeof lessonId === "string", "LessonId is required");

  if (lessonId !== "lesson1") {
    return <p>Lesson does not exist</p>;
  }
  const lesson = LESSONS[lessonId];

  return (
    <div className="flex h-full flex-col gap-4 overflow-x-auto">
      <div className="relative h-1/2 max-h-96 w-full overflow-hidden rounded-lg">
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
              <p className="flex flex-col gap-0 text-xs">
                <span className="text-sm">Date, Time</span>
                <span> XXXXXX</span>
              </p>
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
        <h2 className="text-xl font-semibold">
          You will be good at Starting &amp; Stopping the Car
        </h2>

        <div className="space-y-4">
          {lesson.topPoints.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="bg-accent-purple/50 flex h-12 w-12 items-center justify-center rounded-full text-2xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-accent-purple font-semibold">
                  {item.title}
                </h3>
                <p className="text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button className="mt-auto w-full" variant={"purple"}>
          Reschedule
        </Button>
        <div className="space-y-4">
          {[
            {
              icon: <Lightbulb />,
              title: "Car Intro:",
              description: "Dash, gears, controls",
            },
            {
              icon: <ParkingCircle />,
              title: "Get Comfy:",
              description: "Adjust seat, mirrors, steering",
            },
            {
              icon: <PieChart />,
              title: "Start Up:",
              description: "Clutch, neutral, start button",
            },
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="bg-accent-purple/50 flex h-12 w-12 items-center justify-center rounded-full text-2xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-accent-purple font-semibold">
                  {item.title}
                </h3>
                <p className="text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-accent-purple">Card Title</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-center gap-2">
              <Smile size={20} />
              <span>Think of your car as your best buddy</span>
            </p>
            <p className="flex items-center gap-2">
              <User2 size={20} />
              <span>Think of your car as your best buddy</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
