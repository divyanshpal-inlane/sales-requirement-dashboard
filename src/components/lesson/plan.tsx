import { GearIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  StopCircleIcon,
  TowerControl,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import invariant from "tiny-invariant";

import TriviaCard, { Game } from "@/components/lesson/trivia";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const LESSON_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const LESSON_CONTENT: Record<
  (typeof LESSON_IDS)[number],
  {
    id: string;
    content: {
      game: Game;
      remember: { icon: React.ReactNode; text: string }[];
    };
  }
> = {
  "1": {
    id: "1",
    content: {
      remember: [
        { icon: "😊", text: "Think of your car as your best buddy " },
        {
          icon: "👨🏻‍💼",
          text: "Every pro driver has good control of the car - drive slowly ",
        },
      ],
      pointers: [
        { title: "You will be good at Starting & Stopping the Car" },
        {
          points: [
            {
              icons: "😎",
              header: "Car Intro:",
              desc: "Dash, gears, controls",
            },
            {
              icons: "😎",
              header: "Get Comfy:",
              desc: "Adjust seat, mirrors, steering",
            },
            {
              icons: "😎",
              header: "Start Up:",
              desc: "Clutch, neutral, start button",
            },
            {
              icons: "😎",
              header: "Move Forward:",
              desc: "Balance clutch & accelerator",
            },
            { icons: "😎", header: "Stop Smoothly:", desc: "Brake, clutch" },
          ],
        },
      ],
      game: {
        type: "image",
        games: [
          {
            mapAreas: [
              { x: 15.65625, y: 69, width: 93, height: 84, id: 1 },
              { x: 142.65625, y: 55, width: 78, height: 77, id: 2 },
              { x: 221.65625, y: 10, width: 89, height: 125, id: 3 },
            ],
            correctAnswer: 3,
            imageSrc: "/assets/ThreePedal.png",
          },
          {
            mapAreas: [{ x: 203.15625, y: 65, width: 40, height: 24, id: 1 }],
            correctAnswer: 1,
            imageSrc: "/assets/SteeringWheel.png",
          },
        ],
      },
    },
  },
  "2": {
    id: "2",
    content: {
      remember: [
        { icon: "🏎", text: "Keep it chill, under 20 km/h" },
        { icon: "🚧", text: "Distance - Give obstacles some personal space" },
        { icon: "😊", text: "Treat your car like your best buddy" },
      ],
      pointers: [
        { title: "You will start getting the hang of balancing the pedals" },
        {
          points: [
            {
              icons: "😎",
              header: "Pedal Fun:",
              desc: "Drive forward & back on a straight road",
            },
            {
              icons: "😎",
              header: "Stop & Go:",
              desc: "Quick stops, smooth moves (emergency stops)",
            },
            {
              icons: "😎",
              header: "Slope Magic:",
              desc: "Balancing pedals on slopes",
            },
            {
              icons: "😎",
              header: "Mirror Magic:",
              desc: "Grasping the surrounding",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question:
              "While reversing, how can we maintain control of the car?",
            answers: [
              "Just use the mirror",
              "Use the clutch and brake pedals to control speed, and look back",
            ],
            correctAnswer: 2,
          },
          {
            question: "To start driving in a manual car, you should",
            answers: [
              "Press the clutch, shift into first gear, slowly release the clutch while pressing the accelerator",
              "Skip first gear and go straight to second",
            ],
            correctAnswer: 1,
          },
        ],
      },
    },
  },
  "3": {
    id: "3",
    content: {
      remember: [
        {
          icon: "🍫",
          text: "Find the Sweet Spot - Nail the clutch biting point",
        },
        {
          icon: "🚘",
          text: "Slow pace - To sharpen steering skills",
        },
        {
          icon: "💡",
          text: "Use indicators before turns",
        },
      ],
      pointers: [
        { title: "You will start changing gears and practicing turns" },
        {
          points: [
            {
              icons: "😎",
              header: "Gearbox Magic:",
              desc: "Nail the clutch and shift gears smoothly",
            },
            {
              icons: "😎",
              header: "Get Comfy:",
              desc: "Adjust seat, mirrors, steering",
            },
            {
              icons: "😎",
              header: "Steering Skills:",
              desc: "Hold the wheel right, move smoothly",
            },
            {
              icons: "😎",
              header: "Turn Tricks:",
              desc: "Slow down, signal, and check mirrors",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question:
              "What should you do before shifting gears in a manual car?",
            answers: [
              "Press the clutch pedal fully",
              "Press the brake pedal fully",
            ],
            correctAnswer: 1,
          },
          {
            question:
              "Which gear should you use when driving uphill in a manual car?",
            answers: [
              "First or second gear for more power and torque, essential for going uphill",
              "Fifth gear for cruising at higher speeds.",
            ],
            correctAnswer: 1,
          },
        ],
      },
    },
  },
  "4": {
    id: "4",
    content: {
      remember: [
        {
          icon: "🅿️",
          text: "Be slow while parking - check mirrors & signals",
        },
        {
          icon: "⚙️",
          text: "Steer smoothly",
        },
        {
          icon: "🚗",
          text: "Press the clutch completely - release slow & accelerate",
        },
      ],
      pointers: [
        { title: "You will find parking not so tough anymore" },
        {
          points: [
            {
              icons: "😎",
              header: "Find Your Fit:",
              desc: "Spot spaces and align perfectly",
            },
            {
              icons: "😎",
              header: "Mirror Magic:",
              desc: "Judge distance and avoid bumper kisses",
            },
            {
              icons: "😎",
              header: "Slow Steering:",
              desc: "Navigate tight spots with ease",
            },
            {
              icons: "😎",
              header: "Park and Exit:",
              desc: "Right gear & safely open doors",
            },
            {
              icons: "😎",
              header: "Gear Up:",
              desc: "Balance pedals and gear in slow movements",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question:
              "What’s the best way to check your car’s position while parking?",
            answers: [
              "Look at the side mirrors regularly to monitor distance from nearby objects",
              "Open the door and check manually",
            ],
            correctAnswer: 1,
          },
          {
            question:
              "What is the safest practice when exiting a parallel parking spot?",
            answers: [
              "Start moving when the coast looks clear",
              "Check your blind spots and signal before pulling out.",
            ],
            correctAnswer: 2,
          },
        ],
      },
    },
  },
  "5": {
    id: "5",
    content: {
      remember: [
        {
          icon: "🛣",
          text: "Adjust speed to road conditions",
        },
        {
          icon: "🎛",
          text: "Gear Guru - Shift by engine sound or RPM",
        },
        {
          icon: "⚙️",
          text: "Release clutch slowly with gentle acceleration",
        },
      ],
      pointers: [
        { title: "You will drive on main roads for the first time" },
        {
          points: [
            {
              icons: "😎",
              header: "Steady Speed:",
              desc: "1. On straight roads & turns \n 2. Speed control using brakes",
            },
            {
              icons: "😎",
              header: "Gear Shifting:",
              desc: "Without looking",
            },
            {
              icons: "😎",
              header: "Parking Pro:",
              desc: "Parallel park SLIDE!",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question: "How do you maintain a steady speed while making turns?",
            answers: [
              "Slow down before the turn and accelerate smoothly through it",
              "Maintain the same speed throughout the turn",
            ],
            correctAnswer: 1,
          },
          {
            question:
              "How do you maintain steady speed, if you see traffic slowing ahead?",
            answers: [
              "Slam on the brakes",
              "Gradually ease off the accelerator",
            ],
            correctAnswer: 2,
          },
        ],
      },
    },
  },
  "6": {
    id: "6",
    content: {
      remember: [
        {
          icon: "💡",
          text: "Use indicators for lane changes",
        },
        {
          icon: "🚥",
          text: "Traffic Ninja - Keep an eye on the traffic at all times",
        },
        {
          icon: "🚗",
          text: "Speed Maestro - Adjust speed to match conditions",
        },
      ],
      pointers: [
        { title: "You will start to drive at steady speeds on main roads" },
        {
          points: [
            {
              icons: "😎",
              header: "Mirror Magic:",
              desc: "Anticipating others actions ",
            },
            {
              icons: "😎",
              header: "Safe Gaps:",
              desc: "Keep a safe distance from other vehicles",
            },
            {
              icons: "😎",
              header: "Sign Savvy:",
              desc: "Know your traffic signs",
            },
            {
              icons: "😎",
              header: "Blinker Sense:",
              desc: "Use indicators to communicate",
            },
            {
              icons: "😎",
              header: "Lane Loyalty:",
              desc: "Maintain your lane",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question:
              "Why is it important to maintain your lane while driving?",
            answers: [
              "It prevents accidents by ensuring predictable movements",
              "It saves fuel",
            ],
            correctAnswer: 1,
          },
          {
            question: "How often should you check your mirrors while driving?",
            answers: ["Every 5-8 seconds", "Only when changing lanes"],
            correctAnswer: 2,
          },
        ],
      },
    },
  },
  "7": {
    id: "7",
    content: {
      remember: [
        {
          icon: "🚥",
          text: "Keep a sharp eye on traffic, pedestrians, and surprises",
        },
        {
          icon: "🚨",
          text: "Use signals early to keep everyone aware",
        },
        {
          icon: "⚙️",
          text: "Anticipate gear changes in time",
        },
      ],
      pointers: [
        { title: "You will begin to enjoy driving on city roads" },
        {
          points: [
            {
              icons: "😎",
              header: "Smooth Moves:",
              desc: "Stop & start at traffic signals",
            },
            {
              icons: "😎",
              header: "Speed Sense:",
              desc: "Judge and keep the right speed and distance",
            },
            {
              icons: "😎",
              header: "City Maze:",
              desc: "Roundabouts & Intersections Know who goes first",
            },
            {
              icons: "😎",
              header: "Signal Master:",
              desc: "Use indicators to communicate",
            },
            {
              icons: "😎",
              header: "Slope Savvy:",
              desc: "Low gear more power & control",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question: "What's the golden rule when entering a roundabout?",
            answers: [
              "Yield to traffic already in the roundabout",
              "Speed up to merge quickly",
            ],
            correctAnswer: 1,
          },
          {
            question: "How should you signal your exit from a roundabout?",
            answers: [
              "Use your turn signal just before you exit",
              "Use your turn signal at all times",
            ],
            correctAnswer: 1,
          },
        ],
      },
    },
  },
  "8": {
    id: "8",
    content: {
      remember: [
        {
          icon: "🛣",
          text: "All eyes on the road - zero distraction",
        },
        {
          icon: "💡",
          text: "Don’t forget to use indicator and horn to let others know of your action",
        },
      ],
      pointers: [
        { title: "You will start believing in your driving skills" },
        {
          points: [
            {
              icons: "😎",
              header: "Evening Traffic Tamer:",
              desc: "Maintain speeds and distances to handle evening traffic with ease",
            },
            {
              icons: "😎",
              header: "Using indicator at night:",
              desc: "Communicate well with others",
            },
            {
              icons: "😎",
              header: "Night-time Parking Pro:",
              desc: "Learn to park in dim light",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question:
              "How can you signal to another driver that you are about to overtake them at night?",
            answers: [
              "Flash your high beams briefly to communicate your intention",
              "Honk your horn repeatedly",
            ],
            correctAnswer: 1,
          },
          {
            question:
              "What is the best practice for parking at night in a poorly lit area?",
            answers: [
              "Use your hazard lights to increase visibility while parking",
              "Park quickly without using additional lights",
            ],
            correctAnswer: 1,
          },
        ],
      },
    },
  },
  "9": {
    id: "9",
    content: {
      remember: [
        {
          icon: "🏎",
          text: "Drive at consistent speeds",
        },
        {
          icon: "👨🏻‍💼",
          text: "Every pro driver has good control of the car - drive slowly",
        },
        {
          icon: "😊",
          text: "Treat your car like your best buddy",
        },
      ],
      pointers: [
        { title: "You will drive at consistent speeds on a flyover" },
        {
          points: [
            {
              icons: "😎",
              header: "Flyover Flow:",
              desc: "Merge and exit at the right speeds",
            },
            {
              icons: "😎",
              header: "Lane Glider:",
              desc: "Signal, check, and change lanes smoothly",
            },
            {
              icons: "😎",
              header: "Flyover Traffic:",
              desc: "Become comfortable in driving on flyover traffic",
            },
            {
              icons: "😎",
              header: "Tech-Savvy Driver:",
              desc: "Using GPS without distractions",
            },
          ],
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question: "What’s key to driving safely on a flyover?",
            answers: [
              "Maintaining steady speed and lane discipline",
              "Driving faster to avoid traffic",
            ],
            correctAnswer: 1,
          },
          {
            question: "What should you do when merging or exiting a flyover?",
            answers: [
              "Adjust your speed to match traffic and signal in advance",
              "Brake suddenly and exit quickly",
            ],
            correctAnswer: 2,
          },
        ],
      },
    },
  },
};

export default function Plan() {
  const { lessonId } = useParams();
  invariant(typeof lessonId === "string", "LessonID is required");
  const {
    content: { game, remember },
  } = LESSON_CONTENT[lessonId as keyof typeof LESSON_CONTENT];
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isInfoCardOpen, setIsInfoCardOpen] = useState(true);
  const [isSessionDetailsMinimized, setIsSessionDetailsMinimized] =
    useState(true);

  const finishGame = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const menuItems = useMemo(
    () => [
      {
        title: "you drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
        content: <TriviaCard finishGame={finishGame} game={game} />,
      },
      {
        title: "car command center",
        icon: "🚨",
        color: "bg-indigo-500",
        content: (
          <video
            className="w-80 overflow-hidden rounded-lg"
            autoPlay
            muted
            playsInline
          >
            <source src="/assets/parallel-parking.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ),
      },
    ],
    [game, finishGame],
  );

  const handleCardClick = (index: number) => {
    setSelectedCard(index);
    setIsInfoCardOpen(false);
  };

  const handleBackClick = () => {
    if (selectedCard !== null) {
      setSelectedCard(null);
    } else {
      setIsMenuOpen(false);
      setIsInfoCardOpen(true);
    }
  };

  return (
    <div
      key={lessonId}
      className="relative h-full w-full overflow-hidden text-foreground"
    >
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src="/assets/lesson1-hero.png"
        alt="Parallel Parking"
      />

      <div className="absolute inset-0 bg-black bg-opacity-50" />

      <div className="relative z-10 flex h-full w-full flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex w-full flex-row items-center justify-between gap-2 text-4xl font-bold">
            <Button
              size={"icon"}
              variant={"ghost"}
              className="text-white"
              onClick={() => navigate("/schedule")}
            >
              <ArrowLeft />
            </Button>

            <p className="text-white">Lesson {lessonId}</p>
            <Button
              size={"icon"}
              variant={"ghost"}
              className="text-white"
              onClick={() =>
                navigate(
                  `/lesson/${Number(lessonId) < 10 ? Number(lessonId) + 1 : lessonId + 1}`,
                )
              }
            >
              <ArrowRight />
            </Button>
          </div>
        </div>

        {!isMenuOpen && (
          <AnimatePresence>
            <motion.div
              key="session-details"
              initial={false}
              animate={{
                height: isSessionDetailsMinimized ? "auto" : "auto",
                opacity: 1,
              }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mx-4 mb-4 rounded-3xl bg-[#FFFFF0]/60 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Session Details</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setIsSessionDetailsMinimized(!isSessionDetailsMinimized)
                  }
                >
                  {isSessionDetailsMinimized ? <ChevronDown /> : <ChevronUp />}
                </Button>
              </div>
              <motion.div
                initial={false}
                animate={{
                  height: isSessionDetailsMinimized ? 0 : "auto",
                  opacity: isSessionDetailsMinimized ? 0 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex w-full flex-col flex-wrap gap-6 gap-y-1 font-light">
                  <div className="flex w-full flex-row gap-4">
                    <div className="flex w-full flex-col gap-0">
                      <p className="text-sm font-light">Date, Time</p>
                      <p className="text-base">Mon 12th Sept, 9:00AM</p>
                    </div>
                    <div className="flex w-full flex-col gap-0">
                      <p className="text-sm font-light">Instructor Name</p>
                      <p className="text-base">XXXXXX</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-row gap-4">
                    <div className="flex w-full flex-col gap-0">
                      <p className="text-sm font-light">Pick Up location</p>
                      <p className="text-base">XXXXXX</p>
                    </div>
                    <div className="flex w-full flex-col gap-0">
                      <p className="text-sm font-light">Car Model</p>
                      <p className="text-base">XXXXXX</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-row gap-4">
                    <div className="flex flex-col gap-0">
                      <p className="text-sm font-light">Car Number</p>
                      <p className="text-base">XXXXXX</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              {isSessionDetailsMinimized && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-light"
                >
                  Date, Time: Mon 12th Sept, 9:00AM
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {selectedCard === null ? (
          <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-center gap-6">
            <Button
              onClick={() => {
                /* Implement reschedule logic */
              }}
              size={"lg"}
              className="w-32 text-lg"
            >
              Reschedule
            </Button>
            <Button
              onClick={() => {
                if (isMenuOpen) setIsInfoCardOpen(true);
                setIsMenuOpen(!isMenuOpen);
              }}
              size={"lg"}
              className="w-32 text-lg"
            >
              {isMenuOpen ? "Info" : "Prep time"}
            </Button>
          </div>
        ) : null}

        <AnimatePresence mode="popLayout">
          {isInfoCardOpen && !isMenuOpen ? (
            <motion.div
              key="info-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex w-full grow overflow-y-auto"
            >
              <ScrollArea className="mx-4 mb-4 flex grow overflow-y-auto rounded-b-3xl rounded-t-3xl bg-[#FFFFF0]">
                <div className="flex flex-col gap-4 p-6 pb-16">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Information</h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsInfoCardOpen(!isInfoCardOpen)}
                    >
                      {isInfoCardOpen ? <ChevronDown /> : <ChevronUp />}
                    </Button>
                  </div>
                  <div className="mt-4">
                    <h3 className="mb-4 text-lg font-semibold">
                      You will be good at starting & stopping the car
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <TowerControl className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-accent-purple">
                            Car Intro
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Dash, gears and controls
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-accent-purple">
                            Get comfy
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Adjust seat, mirrors, steering
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <GearIcon className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-accent-purple">
                            Start Up
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Clutch, neutral, start button
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StopCircleIcon className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-accent-purple">
                            Stop smoothly
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Brake, clutch
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-black bg-opacity-10 p-4 backdrop-blur-sm">
                    <h4 className="mb-2 text-lg text-accent-purple">
                      Things to remember
                    </h4>
                    <div className="flex flex-col gap-2">
                      {remember.map(({ icon, text }) => (
                        <p
                          key={text}
                          className="flex flex-row items-center gap-2"
                        >
                          <span className="text-2xl">{icon}</span>
                          <span className="text-sm">{text}</span>
                        </p>
                      ))}
                      {/* <p className="flex flex-row items-center gap-2">
                        <span className="text-2xl">😊</span>
                        <span className="text-sm">
                          Think of your car as your best buddy
                        </span>
                      </p>
                      <p className="flex flex-row items-center gap-2">
                        <span className="text-2xl">👨🏻‍💼</span>
                        <span className="text-sm">
                          Every car driver has good control of the car - drive
                          slowly
                        </span>
                      </p> */}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          ) : isMenuOpen ? (
            <motion.div
              key="card-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grow"
            ></motion.div>
          ) : null}

          {isMenuOpen && selectedCard === null && (
            <motion.div
              key="menu"
              initial={{ y: "100%" }}
              animate={{ y: (menuItems.length - 1) * 20 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: -index * 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${item.color} flex cursor-pointer items-center justify-between rounded-lg p-4 py-8`}
                  onClick={() => handleCardClick(index)}
                >
                  <span className="text-3xl font-medium">{item.title}</span>
                  <span className="text-2xl">{item.icon}</span>
                </motion.div>
              ))}
              <div className="h-20"></div>
            </motion.div>
          )}

          {selectedCard !== null && (
            <motion.div
              key="selected-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`${menuItems[selectedCard].color} relative flex h-full w-full flex-col overflow-y-auto rounded-t-3xl`}
            >
              <div className="sticky top-0 flex flex-row items-center justify-between gap-2 px-6">
                <h2 className="text-3xl font-medium">
                  {menuItems[selectedCard].title}
                </h2>
                <p className="text-[56px]">{menuItems[selectedCard].icon}</p>
              </div>

              <ScrollArea className="flex-grow px-6 pb-6">
                <div className="flex h-full flex-col items-center justify-between gap-2">
                  {menuItems[selectedCard].content}
                </div>
                <ScrollBar className="bg-accent-purple/60" />
              </ScrollArea>
              <Button
                className="absolute bottom-4 left-1/2 -translate-x-1/2"
                variant={"secondary"}
                onClick={handleBackClick}
              >
                Back to Menu
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
