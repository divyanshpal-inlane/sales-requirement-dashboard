import {
  ArrowLeft,
  BadgeInfo,
  IdCardIcon,
  Info,
  PhoneForwardedIcon,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TimerAndEmergency() {
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prevTime) => prevTime + 10); // Increase time every 10 milliseconds
    }, 10);

    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor((time / 60000) % 60);
    const seconds = Math.floor((time / 1000) % 60);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  };
  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">Let’s go for it!</h1>
          <div className="w-6" />
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="rounded-lg bg-gray-800 p-4 text-center font-mono text-6xl text-white shadow-lg">
            {formatTime(time)}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex flex-row items-center justify-center gap-3">
                <IdCardIcon />
                <p>Instructor Details</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-sm bg-gray-100 px-1.5 py-1.5 text-gray-600">
                <User
                  className="absolute -left-1 -top-1.5 rounded-full bg-slate-300"
                  size={18}
                />
                <div className="font-bold">
                  <p>Instructor Name</p>
                </div>
                <div className="text-start text-sm">Rakesh Singh</div>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-sm bg-gray-100 px-1.5 py-1.5 text-gray-600">
                <BadgeInfo
                  className="absolute -left-1 -top-1.5 rounded-full bg-slate-300"
                  size={18}
                />
                <div className="font-bold">
                  <p>Car Model</p>
                </div>
                <div className="text-start text-sm">Skoda</div>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-sm bg-gray-100 px-1.5 py-1.5 text-gray-600">
                <PhoneForwardedIcon
                  className="absolute -left-1 -top-1.5 rounded-full bg-slate-300"
                  size={18}
                />
                <div className="font-bold">
                  <p>Instructor Ph.</p>
                </div>
                <div className="text-start text-sm">91272876261</div>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-sm bg-gray-100 px-1.5 py-1.5 text-gray-600">
                <Info
                  className="absolute -left-1 -top-1.5 rounded-full bg-slate-300"
                  size={18}
                />
                <div className="font-bold">
                  <p>License Plate</p>
                </div>
                <div className="text-start text-sm">HR51 BV3737</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="mt-6 w-full" variant={"purple"}>
          Emergency Button
        </Button>
      </div>
    </PurpleGradient>
  );
}
