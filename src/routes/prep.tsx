import { User } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Prep() {
  const games = [
    {
      image: "/assets/master-the-roads.png",
      title: "Master the roads:",
      description: "Ace real-life driving scenarios",
      link: "https://staging.d2faprkm3jkt4j.amplifyapp.com/",
    },
    {
      image: "/assets/crush-it.jpg",
      title: "Crush it:",
      description: "Know your road signs",
      link: "https://staging.dlv8h2fl9238x.amplifyapp.com/",
    },
    {
      image: "/assets/hazard-hero.png",
      title: "Sharpen your reflexes:",
      description: "Spot hazards while driving",
      link: "https://staging.d3dib7h5q2vkq4.amplifyapp.com/",
      // link: "https://staging.d2faprkm3jkt4j.amplifyapp.com/",
    },
    {
      image: "/assets/speed-test.png",
      title: "Speed Test:",
      description: "How fast can you spot road signs",
      link: "https://staging.d2hisid6yp5sd9.amplifyapp.com/",
    },
  ];
  return (
    <div className="flex h-full flex-col bg-black pb-20 text-primary-foreground">
      <img
        src="/assets/game-club.png"
        className="absolute left-0 right-0 top-0 aspect-auto w-full object-fill"
        alt="Game-club"
      />
      <header className="z-10 flex items-center justify-between bg-black/50 p-6">
        <p></p>
        <div className="rounded-full bg-primary p-2">
          <Link to="/profile">
            <User size={24} className="text-primary-foreground" />
          </Link>
        </div>
      </header>
      <ScrollArea className="bg-black/50">
        <div className="relative flex w-full flex-col gap-5 p-6 pb-0">
          <p className="h-40"></p>
          <p className="text-4xl">Lane Learning Game Club</p>
          <div className="flex flex-col gap-4">
            {games.map((game, index) => (
              <GameCard key={index} {...game} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

const GameCard = ({
  image,
  title,
  description,
  link,
}: {
  image: string;
  title: string;
  description: string;
  link: string;
}) => (
  <div className="flex border-t border-border pt-4">
    <img src={image} alt={title} className="h-48 w-32 shrink-0 object-cover" />
    <div className="flex flex-col justify-center px-4">
      <h3 className="text-sm font-bold text-primary-foreground/70">{title}</h3>
      <p className="mb-2 text-primary-foreground">{description}</p>
      <Button
        onClick={() => window.open(link || "https://inlane.in", "_blank")}
        size={"sm"}
        className="w-fit"
        variant={"secondary"}
      >
        Play now
      </Button>
    </div>
  </div>
);
