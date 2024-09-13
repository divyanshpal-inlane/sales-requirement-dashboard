import { ScrollArea } from "@radix-ui/react-scroll-area";
import { addDays } from "date-fns";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const lessonIds = Array.from({ length: 10 }, (_, i) => i + 1);

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
          <Card className="mt-auto">
            <CardContent className="flex h-full items-center justify-between gap-2 py-4">
              <p className="flex h-full flex-col justify-center gap-1 text-sm">
                <span className="text-accent-purple">Lesson 1</span>
                <span>10th Sept</span>
                <span>9:00 AM</span>
              </p>
              <Button variant={"secondary"} asChild>
                <Link to="/lesson/1">Go to lesson</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lesson" className="flex h-full flex-col">
          <div className="grow">
            <ScrollArea className="overflow-y-auto">
              <div className="flex h-full w-full flex-col gap-2">
                {lessonIds.map((lesson) => (
                  <Card key={lesson}>
                    <CardContent className="flex h-full items-center justify-between gap-2 py-4">
                      <p className="flex h-full flex-col justify-center gap-1 text-sm">
                        <span className="text-accent-purple">
                          Lesson {lesson}
                        </span>
                        <span>10th Sept</span>
                        <span>9:00 AM</span>
                      </p>
                      <Button variant={"secondary"} asChild>
                        <Link to="/lesson/1">Go to lesson</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
