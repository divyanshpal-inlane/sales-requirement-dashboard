import { addDays } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const lessonIds = [
  { id: 1, img_path: "/assets/lesson-pic-1.png", desc: "Get to know your car" },
  { id: 2, img_path: "/assets/lesson-pic-2.png", desc: "Balancing the pedals" },
  {
    id: 3,
    img_path: "/assets/lesson-pic-3.png",
    desc: "Gearbox & Steering Control",
  },
  { id: 4, img_path: "/assets/lesson-pic-4.png", desc: "Conquering Parking" },
  {
    id: 5,
    img_path: "/assets/lesson-pic-5.png",
    desc: "Driving at steady speed ",
  },
  {
    id: 6,
    img_path: "/assets/lesson-pic-6.png",
    desc: "Hitting the main road",
  },
  {
    id: 7,
    img_path: "/assets/lesson-pic-7.png",
    desc: "Bumper to bumper traffic",
  },
  { id: 8, img_path: "/assets/lesson-pic-8.png", desc: "Evening driving" },
  {
    id: 9,
    img_path: "/assets/lesson-pic-9.png",
    desc: "Comfortable with flyovers",
  },
  {
    id: 10,
    img_path: "/assets/lesson-pic-10.png",
    desc: "Mini challenges -  Test Prep",
  },
];
export default function Schedule() {
  return (
    <div className="flex h-full w-full p-6 pb-20">
      <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
        {/* <div className="flex justify-between gap-10"> */}
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="w-full">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="lesson" className="w-full">
            Lesson
          </TabsTrigger>
        </TabsList>
        {/* </div> */}
        <TabsContent
          value="calendar"
          className="flex h-full grow flex-col justify-between"
        >
          <Card>
            <CardHeader>Upcoming schedule</CardHeader>
            <CardContent>
              <Calendar
                mode="multiple"
                selected={[new Date(), addDays(new Date(), 1)]}
                className="w-full rounded-md"
              />
            </CardContent>
          </Card>

          {/* upcoming lesson's card */}

          <Card className="mt-6 bg-gray-50">
            <CardContent className="flex h-full items-center justify-between gap-8 py-4">
              <p className="flex h-full w-2/5 flex-col justify-center gap-1 text-sm">
                <span className="text-accent-purple">Lesson 1</span>
                <span>10th Sept</span>
                <span>9:00 AM</span>
              </p>
              <div className="flex flex-row gap-6 rounded-md bg-white p-2.5">
                <Link
                  to={`/lesson/1`}
                  className="text-md mt-1.5 flex flex-col justify-between"
                >
                  <p>Get to know your car</p>
                </Link>
                {/* image container */}
                <div className="relative flex justify-end">
                  <img
                    className="h-full"
                    src="/assets/lesson-pic-1.png"
                    alt="Lesson-pic"
                  />
                  <div className="absolute -bottom-1.5 flex w-full flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                    <Link to={`/lesson/1`} className="text-xs text-primary">
                      More details
                    </Link>
                    <ChevronRight
                      color="white"
                      className="rounded-full bg-primary"
                      size={16}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lesson" className="flex h-full flex-col">
          <div className="h-full grow">
            <div className="flex h-[95%] w-full flex-col gap-2 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {lessonIds.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 shadow-md"
                  >
                    <p className="text-accent-purple">Lesson {lesson.id}</p>
                    <div className="relative">
                      <img src={lesson.img_path} alt="Lesson-pic" />
                      <div className="absolute -bottom-1.5 right-1 flex w-[75%] flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                        <Link
                          to={`/lesson/${lesson.id}`}
                          className="text-xs text-primary"
                        >
                          More details
                        </Link>
                        <ChevronRight
                          color="white"
                          className="rounded-full bg-primary"
                          size={16}
                        />
                      </div>
                    </div>
                    <Link
                      to={`/lesson/${lesson.id}`}
                      className="text-md mt-1.5"
                    >
                      {lesson.desc}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
