import { LessonContent } from "../Lesson";

export const SLOPES_PARKING_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-1.png",
    menu: {
      trivia: {
        title: "You drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "perpendicular parking",
          icon: "🚗",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/4-1.mp4",
        },
        {
          title: "3 seconds is all it takes",
          icon: "⏰",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-1.mp4",
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
          icon: "🔲",
          text: "Visualise the parking spot and plan before parking",
        },
        {
          icon: "🅿️",
          text: "Be slow while parking - check mirrors & signals",
        },
        {
          icon: "🔁",
          text: "Steer smoothly",
        },
        {
          icon: "⚙️",
          text: "Use handbrake for uphill starts",
        },
      ],
      title: "Conquer Slopes & Perpendicular Parking – No More Stress!",
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
          icon: "vlc.svg",
          header: "Park and Exit:",
          desc: "Right gear & safely open doors",
        },
        {
          icon: "slope.svg",
          header: "Slope Magic:",
          desc: "Balancing pedals on slopes",
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
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-1.png",
    menu: {
      trivia: {
        title: "clueless about gears",
        icon: "🤔",
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
          title: "pause, bump, then go!",
          icon: "🛑",
          color: "bg-indigo-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/5.mp4",
        },
        {
          title: "When to change Gears?",
          icon: "⚙️",
          color: "bg-green-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-1.mp4",
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
      title: "Parallel Parking Doesn’t Have to Be Scary",

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
        {
          icon: "slope.svg",
          header: "Slope Driving confidence:",
          desc: "Build control while starting and stopping on inclines",
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
  "3": {
    id: "3",
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-2.png",
    menu: {
      trivia: {
        title: "you drove into a quiz",
        icon: "🤖",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-lime-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-2.mp4",
        },
      ],
    },
    content: {
      remember: [
        {
          icon: "⚙️",
          text: "Use lower gears for both uphill climbs and downhill control.",
        },
        {
          icon: "🔁",
          text: "Avoid abrupt steering movements",
        },
        {
          icon: "👀",
          text: "Always check mirrors and blind spots before any move",
        },
      ],
      title: "Own the Slope Driving - Smooth & Steady",
      points: [
        {
          icon: "parking.svg",
          header: "Refine Perpendicular Parking:",
          desc: "For accurate alignment and clean exits",
        },
        {
          icon: "parallelpark.svg",
          header: "Practice Parallel Parking:",
          desc: "For perfect finish every time",
        },
        {
          icon: "uphill.svg",
          header: "Speed control on slopes:",
          desc: "Engine braking (shifting to low gear) and light foot braking while going downhill",
        },
        {
          icon: "downhill.svg",
          header: "Controlled downhill driving:",
          desc: "Steer gently through downhill curves and maintain steady speed",
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
  "4": {
    id: "4",
    description: "Get to know your car",
    image_path: "/assets/lesson-pic-2.png",
    menu: {
      trivia: {
        title: "",
        icon: "",
        color: "",
      },
      video: [
        {
          title: "slay slopes like a pro",
          icon: "⏰",
          color: "bg-lime-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/2-2.mp4",
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
      title: "Bring It All Together – Drive, Park & Own the Road",

      points: [
        {
          icon: "uphill.svg",
          header: "Slope Driving Mastery:",
          desc: "Uphill starts, downhill control, and transition on level roads",
        },
        {
          icon: "parking.svg",
          header: "Perfect Parking:",
          desc: "Learn clean exits and quick adjustments to tackle any parking spot",
        },
        {
          icon: "government.svg",
          header: "Mini Challenges:",
          desc: "Practice all manoeuvres and brush up your driving skills",
        },
        {
          icon: "calm.svg",
          header: "Zen Mode:",
          desc: "Tips to stay relaxed & focused while driving",
        },
      ],
    },
  },
};
