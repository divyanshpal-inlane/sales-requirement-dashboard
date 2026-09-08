import { User } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PREP_GAMES, type PrepGameId } from "@/constants/prepGames";
import { recordGameLaunch } from "@/queries/gameAnalytics";

export default function Prep() {
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
            {PREP_GAMES.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

const GameCard = ({
  id,
  image,
  title,
  description,
  link,
}: {
  id: PrepGameId;
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
        onClick={() => {
          window.open(link, "_blank", "noopener,noreferrer");
          void recordGameLaunch(id).catch(() => {
            console.warn("Game launch analytics could not be saved");
          });
        }}
        size={"sm"}
        className="w-fit"
        variant={"secondary"}
      >
        Play now
      </Button>
    </div>
  </div>
);
