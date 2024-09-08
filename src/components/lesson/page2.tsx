import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Lightbulb,
  ParkingCircle,
  PieChart,
  Smile,
  User2,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LessonPage2() {
  return (
    <PurpleGradient>
      <div className="flex h-full flex-col justify-between gap-8 p-6">
        <header className="flex flex-row">
          <Link to="/lesson">
            <Button
              variant={"ghost"}
              size={"icon"}
              className="text-primary-foreground"
            >
              <ArrowLeft />
            </Button>
          </Link>
        </header>
        <div className="flex h-fit flex-col gap-8">
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
        <Button className="w-full" variant={"purple"}>
          Reschedule
        </Button>
      </div>
    </PurpleGradient>
  );
}
