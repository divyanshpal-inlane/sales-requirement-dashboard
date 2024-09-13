import React from "react";

interface LessonPlanItem {
  icon: string;
  title: string;
  description: string;
}

interface LessonPlanCardProps {
  title: string;
  items: LessonPlanItem[];
  hours: number;
}

const items = [
  {
    icon: "↑",
    title: "Pedal Fun:",
    description: "Drive forward & back on a straight road",
  },
  {
    icon: "🛑",
    title: "Stop & Go:",
    description: "Quick stops, smooth moves (emergency stops)",
  },
  {
    icon: "🚗",
    title: "Slope Magic:",
    description: "Conquer slopes",
  },
  {
    icon: "🪞",
    title: "Mirror Magic:",
    description: "Mirrors are your best friends",
  },
];

const LessonPlanCard: React.FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex aspect-[2/3] w-full max-w-sm flex-col justify-center rounded-[30px] bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.19),_0_6px_6px_rgba(0,0,0,0.23)] transition-all duration-300 hover:shadow-[0_14px_28px_rgba(0,0,0,0.25),_0_10px_10px_rgba(0,0,0,0.22)]">
        <div className="relative flex h-full w-full flex-col items-center justify-start overflow-hidden rounded-[24px] border-2 border-gray-400 bg-white p-2 pt-6 shadow-inner">
          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-lime-400">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-lime-500">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-700">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 left-0 text-xl font-semibold">
            make it second nature
          </div>

          <div className="absolute -right-20 bottom-16 rotate-90 px-1">
            <p className="px-4 py-1 text-3xl font-bold text-black">Hour one</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanCard;
