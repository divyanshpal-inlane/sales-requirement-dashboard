import { CircleCheckBig, ExternalLinkIcon, PhoneOutgoing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LESSON_CONTENT } from "@/constants/Lesson";

interface ScheduleListProps {
  instructorData: any;
  onOpenLessonPlan: (lesson: any, learner: any) => void;
  onFinishLesson: (scheduleId: string, learnerId: string) => void;
  navigate: (path: string) => void;
}

const ScheduleList = ({
  instructorData,
  onOpenLessonPlan,
  onFinishLesson,
  navigate,
}: ScheduleListProps) => {

  function formatTimeRange(start_time: string, end_time: string): string {
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(":");
      let period = "AM";
      let hourNum = parseInt(hours, 10);

      if (hourNum >= 12) {
        period = "PM";
        if (hourNum > 12) {
          hourNum -= 12;
        }
      }

      if (hourNum === 0) {
        hourNum = 12;
      }

      return `${hourNum}:${minutes} ${period}`;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    return `${formattedStartTime} to ${formattedEndTime}`;
  }

  return (
    <div className="flex flex-col gap-2 pb-4">
      {instructorData?.instructorScheduleDay.map((schedule, index) => {
        const learnerLessonPair = instructorData?.learnerLessonDay.find(
          (ll) => ll.lesson.id === schedule.lesson_id,
        );

        if (!learnerLessonPair) {
          return null;
        }

        const { learner, lesson } = learnerLessonPair;
        const isOngoing = schedule.status === "ongoing";

        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex flex-wrap gap-4 justify-between items-center">
                <div>Lesson {lesson?.number}</div>
                <div className="text-xs">
                  <div className="text-base text-right">
                    {new Date(schedule.date).toLocaleDateString()}
                  </div>
                  {formatTimeRange(
                    schedule.start_time,
                    schedule.end_time,
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                {lesson?.number &&
                  LESSON_CONTENT[lesson.number]?.content.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex flex-row gap-1 items-center">
                  <p className="text-nowrap text-muted-foreground">
                    Pick-up Location :
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-1 items-center text-xs underline truncate hover:text-blue-800"
                  >
                    <span className="truncate">
                      {learner.pick_up_location}
                    </span>
                    <ExternalLinkIcon className="w-4 h-4 shrink-0" />
                  </a>
                </div>
                <div className="flex flex-row gap-1">
                  <p className="text-muted-foreground">Learner name :</p>
                  <p>{learner.name}</p>
                </div>
                <div className="flex flex-row gap-1 items-center">
                  <p className="text-muted-foreground">
                    Contact Learner :{" "}
                  </p>
                  <p>{learner.phone}</p>
                  <div className="ml-1">
                    <a href={`tel:+91${learner.phone}`}>
                      <PhoneOutgoing size={14} />
                    </a>
                  </div>
                </div>

                <Button
                  onClick={() => onOpenLessonPlan(lesson, learner)}
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full text-xs"
                >
                  View Lesson Plan
                </Button>
              </div>
              <Card className="flex flex-row gap-4 justify-between items-center p-2 shadow-md rounded-smb">
                <div className="flex flex-wrap gap-2 justify-between items-center p-1 w-full text-xs">
                  <p>Lesson status : {schedule.status?.toUpperCase()}</p>
                  <div className="flex flex-row gap-24 items-center">
                    {isOngoing ? (
                      <div className="flex relative justify-center items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                      </div>
                    ) : null}
                    {schedule.status === "completed" ? (
                      <div className="flex justify-center items-center">
                        <CircleCheckBig
                          className="text-white bg-green-500 rounded-full"
                          size={18}
                        />
                      </div>
                    ) : null}
                  </div>
                  {isOngoing && (
                    <Button
                      onClick={() =>
                        onFinishLesson(
                          schedule.id.toString(),
                          learner.id,
                        )
                      }
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                    >
                      Finish Lesson
                    </Button>
                  )}
                  {schedule.status !== "ongoing" &&
                    schedule.status !== "completed" && (
                      <Button
                        onClick={() => {
                          navigate(`/otp/${learner.id}/${schedule.id}`);
                        }}
                        size="sm"
                        className="text-xs"
                      >
                        Start
                      </Button>
                    )}
                </div>
              </Card>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ScheduleList;
