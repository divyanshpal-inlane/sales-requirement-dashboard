import { LessonContent } from "../Lesson";

export const TRAFFIC_PARKING_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description: "You will start getting the hang of balancing the pedals",
    image_path: "/assets/Traffic+Parking-Lesson-1.png",
    menu: {
      trivia: {
        title: "car command center",
        icon: "🤖",
        color: "bg-[#00CE84]",
      },
      video: [
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-1.mp4",
        },
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-2.mp4",
        },
        {
          title: "Turn Like a Champ!",
          icon: "↩️",
          color: "bg-[#00CE84]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-2.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "👨🏻‍💼",
          text: "Every pro driver has good control of the car - drive slowly",
        },

        { icon: "🏎", text: "Keep it chill, under 20 km/h" },
        { icon: "🚧", text: "Distance - Give obstacles some personal space" },
        {
          icon: "😊",
          text: "Treat your car like your best buddy",
        },
      ],
      title: "You will be good at Starting & Stopping the Car",
      points: [
        {
          icon: "forward.svg",
          header: "Pedal Fun:",
          desc: "Drive forward & back on a straight road",
        },
        {
          icon: "stop.svg",
          header: "Stop & Go:",
          desc: "Quick stops, smooth moves (emergency stops)",
        },
        {
          icon: "slope.svg",
          header: "Slope Magic:",
          desc: "Balancing pedals on slopes",
        },
        {
          icon: "mirror.svg",
          header: "Mirror Magic:",
          desc: "Grasping the surrounding",
        },
        {
          icon: "rightturn.svg",
          header: "Turn Tricks:",
          desc: "Slow down, signal, and check mirrors",
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
      game1: {
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

  "2": {
    id: "2",
    description: "You will find parking not so tough anymore",
    image_path: "/assets/Traffic+Parking-Lesson-2.png",
    menu: {
      trivia: {
        title: "let’s brake for trivia!",
        icon: "⚙️",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "perpendicular parking",
          icon: "🚗",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/4-1.mp4",
        },
        {
          title: "parallel parking",
          icon: "👀",
          color: "bg-blue-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/4-2.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "🔲",
          text: "Visualise the parking spot and plan before parking",
        },
        {
          icon: "🅿️",
          text: "Be slow while parking - check mirrors & signals",
        },
        {
          icon: "⚙️",
          text: "Steer smoothly",
        },
      ],
      title: "You will find parking not so tough anymore",

      points: [
        {
          icon: "parking.svg",
          header: "Find Your Fit:",
          desc: "Spot spaces and align perfectly",
        },
        {
          icon: "mirror.svg",
          header: "Mirror Magic:",
          desc: "Judge distance and avoid bumper kisses",
        },
        {
          icon: "steering.svg",
          header: "Slow Steering:",
          desc: "Navigate tight spots with ease",
        },
        {
          icon: "gears.svg",
          header: "Soft press on acceelerator:",
          desc: "Slight push on accelerator and quick brake for slow movements",
        },
        {
          icon: "vlc.svg",
          header: "Park and Exit:",
          desc: "Right gear & safely open doors",
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
  "3": {
    id: "3",
    description: "You will drive on main roads and practice steering",
    image_path: "/assets/Traffic+Parking-Lesson-3.png",
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
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/5.mp4",
        },
        {
          title: "clueless about gears",
          icon: "🤔",
          color: "bg-[#00CE84]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-1.mp4",
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
          icon: "🚘",
          text: "Slow pace - To sharpen steering skills",
        },
        { icon: "🐢", text: "Approach turns with caution and control" },

        {
          icon: "⚙️",
          text: "Release clutch slowly with gentle acceleration",
        },
      ],
      title: "You will drive on main roads for the first time",

      points: [
        {
          icon: "pedals.svg",
          header: "Steady Speed:",
          desc: "1. On straight roads & turns \n 2. Speed control using brakes",
        },
        {
          icon: "gears.svg",
          header: "Gearbox Magic:",
          desc: "Nail the clutch & shift smoothly",
        },
        {
          icon: "steering.svg",
          header: "Steering Skills:",
          desc: "Hold the wheel right, move smoothly",
        },
        {
          icon: "parking.svg",
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
    description: "You will start to drive at steady speeds on main roads",
    image_path: "/assets/Traffic+Parking-Lesson-4.png",
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
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/6.mp4",
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
          icon: "mirror.svg",
          header: "Mirror Magic:",
          desc: "Anticipating others actions ",
        },
        {
          icon: "gaps.svg",
          header: "Safe Gaps:",
          desc: "Keep a safe distance from other vehicles",
        },
        {
          icon: "parking.svg",
          header: "Parking Pro:",
          desc: "Practice parking on road",
        },
        {
          icon: "uturn.svg",
          header: "Sign Savvy:",
          desc: "Know your traffic signs",
        },

        {
          icon: "fog-lamp.svg",
          header: "Signal Sense:",
          desc: "Use indicators to communicate",
        },
        {
          icon: "highway.svg",
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
  "5": {
    id: "5",
    description: "You will begin to enjoy driving on city roads",
    image_path: "/assets/Traffic+Parking-Lesson-5.png",
    menu: {
      trivia: {
        title: "test your know-how",
        icon: "🍀",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "Roudabout rules",
          icon: "📷",
          color: "bg-yellow-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/7-1.mp4",
        },
        {
          title: "Crossroad control",
          icon: "🚦",
          color: "bg-orange-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/7-2.mp4",
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
          icon: "🚗",
          text: "Believe in your driving skills",
        },
      ],
      title: "You will begin to enjoy driving on city roads",

      points: [
        {
          icon: "traffic-light.svg",
          header: "Smooth Moves:",
          desc: "Stop & start at traffic signals",
        },
        {
          icon: "speedometer.svg",
          header: "Speed Sense:",
          desc: "Judge and keep the right speed and distance",
        },
        {
          icon: "cityscape.svg",
          header: "City Maze:",
          desc: "Roundabouts & Intersections Know who goes first",
        },
        {
          icon: "fog-lamp.svg",
          header: "Signal Master:",
          desc: "Use indicators to communicate",
        },
        {
          icon: "slopedes.svg",
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
  "6": {
    id: "6",
    description: "You will have an absolutely fun time driving",
    image_path: "/assets/Traffic+Parking-Lesson-6.png",
    menu: {
      signature: {
        title: "autograph please",
        icon: "✍️",
        color: "bg-[#00CE84]",
      },
      trivia: {
        title: "flyover flow facts",
        icon: "⚙️",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "pass like a pro",
          icon: "👀",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/9.mp4",
        },
        {
          title: "view & light the night",
          icon: "🔥",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/8.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "🧔🏻‍♂️",
          text: "Believe in your driving skills and stay fully focused on the road",
        },
        {
          icon: "😊",
          text: "Treat your car like your best buddy",
        },
      ],
      title: "You will have an absolutely fun time driving",
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
          icon: "calm.svg",
          header: "Zen Mode:",
          desc: "Tips to stay relaxed & focused while driving",
        },
        {
          icon: "traffic-light.svg",
          header: "Flyover Traffic:",
          desc: "Become comfortable in driving on flyover traffic",
        },
        {
          icon: "smartphone-call.svg",
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
