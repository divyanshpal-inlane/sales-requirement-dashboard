import { LessonContent } from "../Lesson";

export const SLOPES_LESSON_CONTENT: LessonContent = {
  "1": {
    id: "1",
    description: "Mastering Slope Control – Uphill & Downhill",
    image_path: "/assets/Slopes-Lesson-1.png",
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
      title: "Mastering Slope Control – Uphill & Downhill",
      points: [
        {
          icon: "parking.svg",
          header: "Uphill Starts Without Rollbacks:",
          desc: "Smooth starts using the handbrake method",
        },
        {
          icon: "parallelpark.svg",
          header: "Stopping And Restarting:",
          desc: "Stop and start movement on slopes",
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
  "2": {
    id: "2",
    description: "Climb with Confidence – Conquer Uphill & Downhill",
    image_path: "/assets/Slopes-Lesson-2.png",
    menu: {
      signature: {
        title: "autograph please",
        icon: "✍️",
        color: "bg-[#00CE84]",
      },
      trivia: {
        title: "clueless about gears",
        icon: "🤔",
        color: "bg-purple-400",
      },
      video: [
        {
          title: "When to change Gears?",
          icon: "⚙️",
          color: "bg-[#D9FF7A]",
          video_path:
            "https://inlane-lesson-videos.s3.ap-south-1.amazonaws.com/3-1.mp4",
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
          text: "Avoid excessive acceleration and braking – keep movements smooth and steady",
        },
        {
          icon: "☯️",
          text: "Choose the right gear to avoid engine strain.",
        },
        {
          icon: "👼🏻",
          text: "Stay calm and trust your practice",
        },
      ],
      title: "Climb with Confidence – Conquer Uphill & Downhill",

      points: [
        {
          icon: "uphill.svg",
          header: "Slope Driving Mastery:",
          desc: "Uphill starts, downhill control, and transition on level roads",
        },
        {
          icon: "parking.svg",
          header: "Driving Through Bends:",
          desc: "Smooth steering on bends Anticipate curves",
        },
        {
          icon: "government.svg",
          header: "RTO Rehearsal:",
          desc: "Mini challenges to get test ready Focus on lane driving & parking",
        },
        {
          icon: "calm.svg",
          header: "Zen Mode:",
          desc: "Tips to stay relaxed & focused",
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
};
