import { LessonContent } from "../Lesson";

export const PARKING_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description:
      "You will find parking not so tough anymore: Perpendicular & Parallel Parking",
    image_path: "/assets/Parking-Lesson-1.png",
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
      ],
      title:
        "You will find parking not so tough anymore: Perpendicular & Parallel Parking    ",
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
          icon: "pedals.svg",
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
    description:
      "You will find parking not so tough anymore: Perpendicular & Parallel Parking",
    image_path: "/assets/Parking-Lesson-2.png",
    menu: {
      signature: {
        title: "Sign your completion",
        icon: "✍️",
        color: "bg-[#00CE84]",
      },
      trivia: {
        title: "screen time before drive time",
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
          title: "When to change Gears?",
          icon: "⚙️",
          color: "bg-green-500",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-1.mp4",
        },
        {
          title: "pause, bump, then go!",
          icon: "🛑",
          color: "bg-indigo-500",
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
      title:
        "You will find parking not so tough anymore: Perpendicular & Parallel Parking",

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
};
