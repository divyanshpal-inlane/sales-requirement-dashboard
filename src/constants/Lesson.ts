import { Game } from "@/components/lesson/trivia";

export const LESSON_IDS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

export const LESSON_CONTENT: Record<
  (typeof LESSON_IDS)[number],
  {
    id: string;
    content: {
      game?: Game;
      title: string;
      points: { icon: React.ReactNode; header: string; desc: string }[];
      remember: { icon: React.ReactNode; text: string }[];
    };
    menu?: {
      trivia?: { title: string; icon: string; color: string };
      video?: {
        title: string;
        icon: string;
        color: string;
        video_path: string;
      }[];
      signature?: { title: string; icon: string; color: string };
    };
  }
> = {
  "1": {
    id: "1",
    menu: {
      trivia: {
        title: "You drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "Car command center",
          icon: "🚨",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
    content: {
      remember: [
        { icon: "😊", text: "Think of your car as your best buddy " },
        {
          icon: "👨🏻‍💼",
          text: "Every pro driver has good control of the car - drive slowly ",
        },
      ],
      title: "You will be good at Starting & Stopping the Car",
      points: [
        {
          icon: "😎",
          header: "Car Intro:",
          desc: "Dash, gears, controls",
        },
        {
          icon: "😎",
          header: "Get Comfy:",
          desc: "Adjust seat, mirrors, steering",
        },
        {
          icon: "😎",
          header: "Start Up:",
          desc: "Clutch, neutral, start button",
        },
        {
          icon: "😎",
          header: "Move Forward:",
          desc: "Balance clutch & accelerator",
        },
        { icon: "😎", header: "Stop Smoothly:", desc: "Brake, clutch" },
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
            question: "Which one is the Accelerator?",
          },
          {
            mapAreas: [{ x: 203.15625, y: 65, width: 40, height: 24, id: 1 }],
            correctAnswer: 1,
            imageSrc: "/assets/SteeringWheel.png",
            question: "Where is the turn signal?",
          },
        ],
      },
    },
  },
  "2": {
    id: "2",
    menu: {
      trivia: {
        title: "You drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/parallel-parking.mp4",
        },
      ],
    },
    content: {
      remember: [
        { icon: "🏎", text: "Keep it chill, under 20 km/h" },
        { icon: "🚧", text: "Distance - Give obstacles some personal space" },
        { icon: "😊", text: "Treat your car like your best buddy" },
      ],
      title: "You will start getting the hang of balancing the pedals",

      points: [
        {
          icon: "😎",
          header: "Pedal Fun:",
          desc: "Drive forward & back on a straight road",
        },
        {
          icon: "😎",
          header: "Stop & Go:",
          desc: "Quick stops, smooth moves (emergency stops)",
        },
        {
          icon: "😎",
          header: "Slope Magic:",
          desc: "Balancing pedals on slopes",
        },
        {
          icon: "😎",
          header: "Mirror Magic:",
          desc: "Grasping the surrounding",
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
    menu: {
      trivia: {
        title: "clueless about gears",
        icon: "🤔",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "Turn Like a Champ!",
          icon: "↩️",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will start changing gears and practicing turns",
      points: [
        {
          icon: "😎",
          header: "Gearbox Magic:",
          desc: "Nail the clutch and shift gears smoothly",
        },
        {
          icon: "😎",
          header: "Get Comfy:",
          desc: "Adjust seat, mirrors, steering",
        },
        {
          icon: "😎",
          header: "Steering Skills:",
          desc: "Hold the wheel right, move smoothly",
        },
        {
          icon: "😎",
          header: "Turn Tricks:",
          desc: "Slow down, signal, and check mirrors",
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
    menu: {
      trivia: {
        title: "let’s brake for trivia!",
        icon: "⚙️",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "watch this before parking ",
          icon: "👀",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will find parking not so tough anymore",

      points: [
        {
          icon: "😎",
          header: "Find Your Fit:",
          desc: "Spot spaces and align perfectly",
        },
        {
          icon: "😎",
          header: "Mirror Magic:",
          desc: "Judge distance and avoid bumper kisses",
        },
        {
          icon: "😎",
          header: "Slow Steering:",
          desc: "Navigate tight spots with ease",
        },
        {
          icon: "😎",
          header: "Park and Exit:",
          desc: "Right gear & safely open doors",
        },
        {
          icon: "😎",
          header: "Gear Up:",
          desc: "Balance pedals and gear in slow movements",
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
    menu: {
      trivia: {
        title: "screen time, before drive time",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "pause, bump, then go!",
          icon: "🛑",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will drive on main roads for the first time",

      points: [
        {
          icon: "😎",
          header: "Steady Speed:",
          desc: "1. On straight roads & turns \n 2. Speed control using brakes",
        },
        {
          icon: "😎",
          header: "Gear Shifting:",
          desc: "Without looking",
        },
        {
          icon: "😎",
          header: "Parking Pro:",
          desc: "Parallel park SLIDE!",
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
    menu: {
      trivia: {
        title: "lane change challenge",
        icon: "🤓",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "signal, check, then move!",
          icon: "🛣️",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will start to drive at steady speeds on main roads",

      points: [
        {
          icon: "😎",
          header: "Mirror Magic:",
          desc: "Anticipating others actions ",
        },
        {
          icon: "😎",
          header: "Safe Gaps:",
          desc: "Keep a safe distance from other vehicles",
        },
        {
          icon: "😎",
          header: "Sign Savvy:",
          desc: "Know your traffic signs",
        },
        {
          icon: "😎",
          header: "Blinker Sense:",
          desc: "Use indicators to communicate",
        },
        {
          icon: "😎",
          header: "Lane Loyalty:",
          desc: "Maintain your lane",
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
    menu: {
      trivia: {
        title: "test your know-how",
        icon: "🍀",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "take a sneak peak",
          icon: "📷",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will begin to enjoy driving on city roads",

      points: [
        {
          icon: "😎",
          header: "Smooth Moves:",
          desc: "Stop & start at traffic signals",
        },
        {
          icon: "😎",
          header: "Speed Sense:",
          desc: "Judge and keep the right speed and distance",
        },
        {
          icon: "😎",
          header: "City Maze:",
          desc: "Roundabouts & Intersections Know who goes first",
        },
        {
          icon: "😎",
          header: "Signal Master:",
          desc: "Use indicators to communicate",
        },
        {
          icon: "😎",
          header: "Slope Savvy:",
          desc: "Low gear more power & control",
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
    menu: {
      trivia: {
        title: "twilight trivia time",
        icon: "🌅",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "Car command center",
          icon: "🔥",
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "🛣",
          text: "All eyes on the road - zero distraction",
        },
        {
          icon: "💡",
          text:
            "Don’t forget to use indicator and horn to let others know of your action",
        },
      ],
      title: "You will start believing in your driving skills",

      points: [
        {
          icon: "😎",
          header: "Evening Traffic Tamer:",
          desc:
            "Maintain speeds and distances to handle evening traffic with ease",
        },
        {
          icon: "😎",
          header: "Using indicator at night:",
          desc: "Communicate well with others",
        },
        {
          icon: "😎",
          header: "Night-time Parking Pro:",
          desc: "Learn to park in dim light",
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
          color: "bg-indigo-500",
          video_path: "/assets/parallel-parking.mp4",
        },
      ],
    },
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
      title: "You will drive at consistent speeds on a flyover",
      points: [
        {
          icon: "😎",
          header: "Flyover Flow:",
          desc: "Merge and exit at the right speeds",
        },
        {
          icon: "😎",
          header: "Lane Glider:",
          desc: "Signal, check, and change lanes smoothly",
        },
        {
          icon: "😎",
          header: "Flyover Traffic:",
          desc: "Become comfortable in driving on flyover traffic",
        },
        {
          icon: "😎",
          header: "Tech-Savvy Driver:",
          desc: "Using GPS without distractions",
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
        ],
      },
    },
  },
  "10": {
    id: "10",
    menu: {
      signature: {
        title: "Sign your completion",
        icon: "✍️",
        color: "bg-[#00CE84]",
      },
    },
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
      title: "You will have an absolutely fun time doing the challenges",
      points: [
        {
          icon: "😎",
          header: "RTO Rehearsal:",
          desc:
            "Mini challenges to get test ready Focus on lane driving & parking",
        },
        {
          icon: "😎",
          header: "Zen Mode:",
          desc: "Tips to stay relaxed & focused",
        },
      ],
    },
  },
};
