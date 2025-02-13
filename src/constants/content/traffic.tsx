import { LessonContent } from "../Lesson";

export const TRAFFIC_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-1.png",
    menu: {
      trivia: {
        title: "you drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-1.mp4",
        },
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-lime-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-2.mp4",
        },
        {
          title: "Turn Like a Champ!",
          icon: "↩️",
          color: "bg-lime-500",
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
      title: "You will start getting the hang of balancing the pedals",
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
          icon: "rightturn.svg",
          header: "Turn Tricks:",
          desc: "Slow down, signal, and check mirrors",
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
  "2": {
    id: "2",
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-1.png",
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
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/5.mp4",
        },
        {
          title: "clueless about gears",
          icon: "🤔",
          color: "bg-green-500",
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
          icon: "pedals.svg",
          header: "Steady Speed:",
          desc: "1. On straight roads & turns \n 2. Speed control using brakes",
        },
        {
          icon: "steering.svg",
          header: "Steering Skills:",
          desc: "Hold the wheel right, move smoothly",
        },
        {
          icon: "gears.svg",
          header: "Gear Shifting:",
          desc: "Without looking",
        },
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
    description: "You're getting the hang of it",
    image_path: "/assets/lesson-pic-2.png",
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
      title: "You will start to drive at steady speeds on main roads",

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
          icon: "highway.svg",
          header: "Lane Loyalty:",
          desc: "Maintain your lane",
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
    description: "You're getting the hang of it",
    image_path: "/assets/lesson-pic-2.png",
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
          color: "bg-indigo-500",
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
          icon: "speedometer.svg",
          header: "Speed Sense:",
          desc: "Judge and keep the right speed and distance",
        },
        {
          icon: "fog-lamp.svg",
          header: "Using indicator at night:",
          desc: "Communicate well with others",
        },
        {
          icon: "highway.svg",
          header: "Lane Glider:",
          desc: "Signal, check, and change lanes smoothly",
        },
        {
          icon: "uturn.svg",
          header: "Sign Savvy:",
          desc: "Know your traffic signs",
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
