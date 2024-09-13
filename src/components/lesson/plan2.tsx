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
import { useNavigate } from "react-router-dom";

import TriviaQuestion from "@/components/lesson/triviaQuestion";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Plan2() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
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
        content: (
          <TriviaQuestion
            finishGame={finishGame}
            game={[
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
                question:
                  "While reversing, how can we maintain control of the car?",
                answers: [
                  "Just use the mirror",
                  "Use the clutch and brake pedals to control speed, and look back",
                ],
                correctAnswer: 1,
              },
            ]}
          />
        ),
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
    [],
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
    <div className="relative h-full w-full overflow-hidden text-foreground">
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
              onClick={() => navigate("/lesson/1")}
            >
              <ArrowLeft />
            </Button>

            <p className="text-white">Lesson 2</p>
            <Button
              size={"icon"}
              variant={"ghost"}
              className="text-white"
              onClick={() => navigate("/lesson/3")}
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
                      <p className="text-base">Mon 13th Sept, 9:00AM</p>
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
                  Date, Time: Mon 13th Sept, 9:00AM
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
                      <p className="flex flex-row items-center gap-2">
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
                      </p>
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
