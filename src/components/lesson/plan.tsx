import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import TriviaCard from "@/components/lesson/trivia";
import { Button } from "@/components/ui/button";

export default function Plam() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isReturningToMenu, setIsReturningToMenu] = useState(false);

  const menuItems = [
    {
      title: "meet your instructor",
      icon: "😎",
      color: "bg-emerald-500",
      content: "Here you can find information about your driving instructor.",
    },
    {
      title: "lesson plan car meet & greet",
      icon: "🚗",
      color: "bg-purple-400",
      content: <TriviaCard />,
    },
    {
      title: "car command center",
      icon: "🚨",
      color: "bg-indigo-500",
      content: (
        <video className="h-full w-full" autoPlay muted playsInline>
          <source src="/assets/parallel-parking.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ),
    },
  ];

  const handleCardClick = (index) => {
    setSelectedCard(index);
    setIsReturningToMenu(false);
  };

  const handleBackClick = () => {
    setSelectedCard(null);
    setIsReturningToMenu(true);
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-foreground">
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src="/assets/lesson1-hero.png"
        alt="Parallel Parking"
      />

      {(isMenuOpen || selectedCard !== null) && (
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      )}

      <div className="relative z-10 flex h-full w-full flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-row items-center gap-2 text-4xl font-bold">
            <Button
              size={"icon"}
              variant={"ghost"}
              onClick={() => navigate("/schedule")}
            >
              <ArrowLeft />
            </Button>
            <p>LANE</p>
          </div>
          {selectedCard === null && (
            <Button
              className="bg-white text-black"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              Menu
            </Button>
          )}
        </div>

        <div className="flex-grow" />

        <AnimatePresence>
          {isMenuOpen && selectedCard === null && (
            <motion.div
              initial={isReturningToMenu ? false : { y: "100%" }}
              animate={{ y: (menuItems.length - 1) * 20 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {menuItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={isReturningToMenu ? false : { opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: -index * 20 }}
                  transition={{ delay: isReturningToMenu ? 0 : index * 0.1 }}
                  className={`${item.color} flex cursor-pointer items-center justify-between rounded-lg p-4 py-8`}
                  onClick={() => handleCardClick(index)}
                >
                  <span className="text-4xl font-semibold">{item.title}</span>
                  <span className="text-2xl">{item.icon}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {selectedCard !== null && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className={`${menuItems[selectedCard].color} flex h-full w-full flex-col rounded-t-3xl p-6`}
            >
              <h2 className="mb-4 text-4xl font-bold">
                {menuItems[selectedCard].title}
              </h2>
              <p className="mb-8 h-full w-full text-xl">
                {menuItems[selectedCard].content}
              </p>
              {/* <iframe
                width={"100%"}
                height={"100%"}
                src="https://staging.da3uvaik39s3z.amplifyapp.com/"
                title="Embedded Content"
              ></iframe> */}
              <Button
                className="mt-auto self-start bg-white text-black"
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
