import { LessonContent } from "../Lesson";
export const PARKING_FLYOVER_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description:
      "You will find parking not so tough anymore: Perpendicular Parking",
    image_path: "/assets/Parking+Flyover-Lesson-1.png",
    menu: {
      trivia: {
        title: "you drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "watch this before parking",
          icon: "👀",
          color: "bg-blue-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/4-2.mp4",
        },
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-1.mp4",
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
      title:
        "You will find parking not so tough anymore: Perpendicular Parking",
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
          header: "Soft press on accelerator:",
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
  "2": {
    id: "2",
    description: "You will find parking not so tough anymore: Parallel Parking",
    image_path: "/assets/Parking+Flyover-Lesson-2.png",
    menu: {
      trivia: {
        title: "screen time before drive time",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "watch this before parking",
          icon: "👀",
          color: "bg-[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/4-2.mp4",
        },
        {
          title: "When to change Gears?",
          icon: "⚙️",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-1.mp4",
        },
        {
          title: "pause, bump, then go!",
          icon: "🛑",
          color: "bg-[#00CE84]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/5.mp4",
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
          icon: "🔁",
          text: "Steer slowly while reversing - control is key",
        },
      ],
      title: "You will find parking not so tough anymore: Parallel Parking",
      points: [
        {
          icon: "steering.svg",
          header: "Steering in tight spaces:",
          desc: "Master steering while reversing",
        },
        {
          icon: "gas-pedal.svg",
          header: "Soft press on accelerator:",
          desc: "Balance accelerator and brake for quick movements Avoid sudden jerks while maneuvering",
        },
        {
          icon: "mirror.svg",
          header: "Mirror Magic:",
          desc: "Judge distance and avoid bumper kisses",
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
  "3": {
    id: "3",
    description: "You will drive at consistent speeds on a flyover",
    image_path: "/assets/Parking+Flyover-Lesson-3.png",
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
  "4": {
    id: "4",
    description: "You will feel confident of your parking and flyover skills",
    image_path: "/assets/Parking+Flyover-Lesson-4.png",
    menu: {
      signature: {
        title: "autograph please",
        icon: "✍️",
        color: "bg-purple-400",
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
          color: "[#6257FF]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/9.mp4",
        },
        {
          title: "view & light the night",
          icon: "🔥",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/8.mp4",
        },
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-2.mp4",
        },
      ],
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
          icon: "flyover.svg",
          header: "Flyover Challenge:",
          desc: "Handle traffic stops, quick acceleration and safe overtakes",
        },
        {
          icon: "speedometer.svg",
          header: "Speed Sense:",
          desc: "Balance speed while driving and downhill the flyover",
        },
        {
          icon: "highway.svg",
          header: "Parking Precision:",
          desc: "Parking Precision: Perpendicular and Parallel Parking",
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
