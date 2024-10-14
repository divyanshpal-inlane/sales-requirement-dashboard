import { PhoneOutgoing, SquareArrowOutUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Instructor = () => {
  return (
    <div className="flex h-full w-full p-6 pb-20">
      <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="w-full">
            Schedule For The Day
          </TabsTrigger>
          <TabsTrigger value="lesson" className="w-full">
            Lesson Details
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="calendar"
          className="flex h-full grow flex-col justify-between"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                <div>Lesson 1</div>
                <div className="text-sm">9:00 AM to 10:00 AM</div>
              </CardTitle>
              <CardDescription>
                You will begin to enjoy driving on city roads
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex flex-row items-center gap-1">
                  <p>Pick-up Location :</p>
                  <p>Home</p>
                  <div className="ml-1">
                    <SquareArrowOutUpRight size={14} />
                  </div>
                </div>
                <div className="flex flex-row gap-1">
                  <p>Learner name :</p>
                  <p>Aman</p>
                </div>
                <div className="flex flex-row items-center gap-1">
                  <p>Contact Learner</p>
                  <div className="ml-1">
                    <PhoneOutgoing size={14} />
                  </div>
                </div>
              </div>
              <Card className="rounded-smb flex flex-row items-center justify-between gap-4 p-2 shadow-md">
                <div className="flex flex-wrap gap-1 p-1 text-xs">
                  <p>Lesson status :</p>
                  <p>Not completed</p>
                </div>
                <div>
                  <Button size="sm" className="text-xs">
                    Reschedule
                  </Button>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="lesson"
          className="flex h-full flex-col"
        ></TabsContent>
      </Tabs>
    </div>
  );
};

export default Instructor;
