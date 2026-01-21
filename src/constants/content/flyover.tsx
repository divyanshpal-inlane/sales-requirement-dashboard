import { LessonContent } from "@/constants/Lesson";
export const x = 123;
export const FLYOVER_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description: "You will drive at consistent speeds on a flyover",
    image_path: "/assets/Flyover-Lesson-1.png",
    menu: {
      trivia: {
        title: "clueless about gears",
        icon: "⚙️",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/2-1.mp4",
        },
        {
          title: "signal, check, then move!",
          icon: "🛣️",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/6.mp4",
        },
        {
          title: "When to change Gears?",
          icon: "⚙️",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/3-1.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "🏎",
          text: "Drive at consistent speeds, avoid unnecessary acceleration",
        },
        {
          icon: "📒",
          text: "Plan exits well in advance",
        },
        {
          icon: "👀",
          text: "Use mirrors and signals for lane movements",
        },
      ],
      title: "You will drive at consistent speeds on a flyover",
      points: [
        {
          icon: "flyover-bridge.svg",
          header: "Flyover Flow:",
          desc: "Merge and exit at the right speeds",
        },
        {
          icon: "highway.svg",
          header: "Lane Glider:",
          desc: "Signal, check, and change lanes smoothly",
        },
        {
          icon: "steering.svg",
          header: "Steering on Curves:",
          desc: "Maintain lane discipline & handle sharp flyovers curves",
        },
        {
          icon: "speedometer.svg",
          header: "Speed Sense:",
          desc: "Judge and keep the right speed and distance",
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
            correctAnswer: 1,
          },
        ],
      },
    },
  },
  "2": {
    id: "2",
    description: "You will feel confident of your flyover skills",
    image_path: "/assets/Flyover-Lesson-2.png",
    menu: {
      trivia: {
        title: "flyover flow facts",
        icon: "⚙️",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "pass like a pro",
          icon: "👀",
          color: "bg-[#00CE84]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/9.mp4",
        },
        {
          title: "view & light the night",
          icon: "🔥",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/8.mp4",
        },
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-[#00CE84]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/2-2.mp4",
        },
        {
          title: "pause, bump, then go!",
          icon: "🛑",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-content.s3.ap-south-1.amazonaws.com/5.mp4",
        },
      ],
      signature: {
        title: "autograph please",
        icon: "✍️",
        color: "bg-[#00CE84]",
      },
    },
    content: {
      remember: [
        {
          icon: "🛣️",
          text: "All eyes on the road - zero distractions",
        },
        {
          icon: "💡",
          text: "Don’t forget to use indicator and horn to let others know of your action",
        },
        {
          icon: "👼",
          text: "Stay calm, patient and maintain control",
        },
      ],
      title: "You will feel confident of your flyover skills",

      points: [
        {
          icon: "flyover-bridge.svg",
          header: "Flyover Challenge:",
          desc: "Handle traffic stops, quick acceleration and safe overtakes",
        },
        {
          icon: "speedometer.svg",
          header: "Speed Sense:",
          desc: "Balance speed while driving and downhill the flyover",
        },
        {
          icon: "mirror.svg",
          header: "Mirror & Signal Check:",
          desc: "Check mirrors, blind spots, and traffic flow before moving",
        },
        {
          icon: "overtake.svg",
          header: "Safe Overtaking:",
          desc: "Be careful of when to overtake Maintain safe distance while merging into the lane",
        },
      ],
      game: {
        type: "question",
        games: [
          {
            question: "What's key to driving safely on a flyover?",
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
};
