import type { QuestionGame } from "@/components/lesson/trivia";

// Beginner course question bank supplied by the curriculum team.
export const LESSON_TRIVIA = {
  "1": {
    type: "question",
    games: [
      {
        question:
          "Which part of a car do you press to slow down or stop the vehicle?",
        answers: ["Accelerator", "Brake pedal", "Clutch", "Handbrake lever"],
        correctAnswer: 2,
        explanation:
          "The brake pedal, operated with the right foot, is the primary control used to slow or stop a vehicle.",
      },
      {
        question:
          "Before getting into the driver's seat, which check should you perform first?",
        answers: [
          "Adjust the rear-view mirror",
          "Walk around the vehicle to check tyres, lights, and for any obstructions",
          "Start the engine",
          "Fasten the seatbelt",
        ],
        correctAnswer: 2,
        explanation:
          "A walk-around check helps spot flat tyres, damaged lights, leaks, or people/obstacles near the car before you get in.",
      },
      {
        question:
          "After sitting in the driver's seat but before starting the engine, what should you check first?",
        answers: [
          "Fuel price at the nearest station",
          "Seat position, mirrors, and seatbelt",
          "Music/infotainment settings",
          "Boot space",
        ],
        correctAnswer: 2,
        explanation:
          "Adjusting your seat and mirrors and fastening your seatbelt ensures proper control and visibility before driving.",
      },
    ],
  },
  "2": {
    type: "question",
    games: [
      {
        question: 'What is the "biting point" in a manual/clutch vehicle?',
        answers: [
          "The point where the accelerator is fully pressed",
          "The point while releasing the clutch where it starts to engage the engine with the wheels",
          "The moment the handbrake is released",
          "The maximum speed of the vehicle",
        ],
        correctAnswer: 2,
        explanation:
          "The biting point is where the clutch plate starts contacting the flywheel, letting the car move off smoothly without stalling or jerking.",
      },
      {
        question: "What is the correct sequence for a normal, planned stop?",
        answers: [
          "Brake hard first, then check mirrors",
          "Check mirrors, signal, ease off the accelerator, then brake progressively",
          "Turn off the engine, then brake",
          "Release the clutch fully before braking",
        ],
        correctAnswer: 2,
        explanation:
          "A smooth stop involves checking mirrors and signaling first, then gradually braking, giving following traffic time to react.",
      },
      {
        question: "In an emergency stop, what should you prioritize?",
        answers: [
          "Steering sharply to avoid braking",
          "Braking firmly and promptly while keeping the vehicle under control, without unnecessary swerving",
          "Slowly easing off the accelerator only",
          "Turning off the engine immediately",
        ],
        correctAnswer: 2,
        explanation:
          "An emergency stop requires firm, immediate braking to reduce speed as fast as possible while maintaining control and avoiding a skid.",
      },
    ],
  },
  "3": {
    type: "question",
    games: [
      {
        question:
          'In the "push-pull" steering method, how should your hands move on the wheel?',
        answers: [
          "Cross your hands over each other while turning",
          "One hand pushes the wheel up while the other slides and pulls it down, without crossing hands",
          "Keep both hands fixed at the top of the wheel at all times",
          "Steer using only one hand at all times",
        ],
        correctAnswer: 2,
        explanation:
          "This method keeps both hands on the wheel without crossing, giving better control and reducing injury risk if the airbag deploys.",
      },
      {
        question:
          "When should you typically shift to a higher gear while driving?",
        answers: [
          "As soon as the car starts moving",
          "When the engine RPM rises and the car has gained enough speed for the current gear",
          "Only when going downhill",
          "Only when coming to a stop",
        ],
        correctAnswer: 2,
        explanation:
          "Shifting up at the right engine speed keeps the car running smoothly, avoiding strain from too low a gear or lag from too high a gear.",
      },
    ],
  },
  "4": {
    type: "question",
    games: [
      {
        question:
          'Which of the following is classified as an "objectionable" place to park a vehicle?',
        answers: [
          "A marked, designated parking bay",
          "Near a road junction or intersection",
          "A private driveway",
          "A wide residential street with no posted signage",
        ],
        correctAnswer: 2,
        explanation:
          "Parking near intersections, crossings, bus stops, or hydrants obstructs visibility and traffic flow, and is prohibited regardless of signage.",
      },
      {
        question:
          "While reversing in a straight line, where should your focus mainly be?",
        answers: [
          "Only on the front windshield",
          "Looking back over your shoulder and checking mirrors continuously",
          "Only on the speedometer",
          "Only on the driver-side mirror",
        ],
        correctAnswer: 2,
        explanation:
          "Turning to look through the rear windshield along with checking mirrors gives the clearest view of the path and obstacles behind.",
      },
      {
        question:
          "When reversing through an 'S'-shaped bend, what is key to steering correctly?",
        answers: [
          "Turning the wheel in only one direction throughout",
          "Steering opposite to the direction the rear of the car needs to go at each curve, adjusting as the path bends",
          "Keeping the steering wheel completely straight",
          "Reversing as fast as possible to complete it quickly",
        ],
        correctAnswer: 2,
        explanation:
          "The steering direction must change as the bend changes, while continuously checking mirrors and positioning.",
      },
      {
        question:
          "When performing a three-point turn on a narrow road, what is essential to check before starting?",
        answers: [
          "Only the front of the vehicle",
          "All directions for approaching traffic, pedestrians, and available space",
          "Only whether the handbrake works",
          "The fuel gauge",
        ],
        correctAnswer: 2,
        explanation:
          "A three-point turn spans the width of the road, so checking all-round for traffic and pedestrians is essential before and during the maneuver.",
      },
      {
        question: "What do painted parking bay markings on a road indicate?",
        answers: [
          "A no-parking zone",
          "A designated, permitted area for vehicles to park",
          "A pedestrian crossing",
          "A bus lane",
        ],
        correctAnswer: 2,
        explanation:
          "Painted bay markings define the exact boundary within which a vehicle is permitted to park, keeping parked vehicles organized and out of traffic lanes.",
      },
    ],
  },
  "5": {
    type: "question",
    games: [
      {
        question:
          "Why do traffic regulations generally set lower speed limits in city/urban areas compared to highways?",
        answers: [
          "Higher traffic density, pedestrians, and frequent intersections require slower, safer speeds",
          "City roads are always physically narrower than highways",
          "Lower speeds save more fuel regardless of road type",
          "Urban areas have more police checkpoints",
        ],
        correctAnswer: 1,
        explanation:
          "Cities have more pedestrians, intersections, and mixed traffic, so lower limits reduce accident risk and give drivers more reaction time.",
      },
      {
        question: 'What is "design speed" of a road?',
        answers: [
          "The speed at which most drivers actually drive",
          "The maximum safe speed a road's geometry (curves, sight lines, gradients) is designed to accommodate",
          "The posted speed limit only",
          "The average speed of trucks on that road",
        ],
        correctAnswer: 2,
        explanation:
          "Design speed determines how curves, banking, and sight distances are engineered so a vehicle can travel safely at that speed under normal conditions.",
      },
      {
        question:
          "Why does road surface type (e.g. asphalt vs. concrete vs. gravel) matter for driving?",
        answers: [
          "It only affects the road's appearance",
          "It affects tyre grip, braking distance, and how the vehicle handles, especially in wet conditions",
          "It has no effect on driving safety",
          "It only matters for vehicle fuel efficiency",
        ],
        correctAnswer: 2,
        explanation:
          "Different surfaces offer different friction/grip levels — a wet or gravel surface reduces traction significantly compared to dry asphalt, directly affecting braking distance and cornering.",
      },
      {
        question:
          "When driving downhill on a steep slope, what should a driver do?",
        answers: [
          "Shift to a higher gear and coast in neutral",
          "Use engine braking (a lower gear) along with the brakes to control speed",
          "Rely only on the handbrake",
          "Maintain the same gear as on flat roads",
        ],
        correctAnswer: 2,
        explanation:
          "On steep downhill slopes, engine braking in a lower gear reduces strain on the brakes and prevents brake fade from overheating.",
      },
      {
        question: 'What does "functional classification" of roads refer to?',
        answers: [
          "The color of the road surface",
          "Categorizing roads based on the type of service they provide, e.g. expressways, arterial roads, collector roads, local roads",
          "The number of vehicles allowed per day",
          "The age of the road",
        ],
        correctAnswer: 2,
        explanation:
          "Roads are functionally classified by their purpose — from high-speed through-traffic roads (expressways/arterials) down to local access roads — which determines design standards and speed limits.",
      },
      {
        question:
          '"Road geometrics" primarily deals with which aspect of road design?',
        answers: [
          "Traffic police deployment",
          "The physical layout — width, curves, gradients, cross-section, and alignment of the road",
          "Vehicle registration rules",
          "Toll pricing",
        ],
        correctAnswer: 2,
        explanation:
          "Road geometrics covers the physical dimensions and shape of a road — width, curvature, camber, and gradient — designed for safety and smooth traffic flow.",
      },
      {
        question: "Why is sight distance especially important at road bends?",
        answers: [
          "It determines the road's toll cost",
          "A driver needs enough visible distance ahead on a curve to stop safely if an obstacle appears",
          "It only matters for cyclists",
          "It affects the color of road markings used",
        ],
        correctAnswer: 2,
        explanation:
          "On a bend, the curve itself can block a driver's view of what lies ahead, so adequate sight distance ensures there's enough time to see and react to obstacles or oncoming traffic.",
      },
      {
        question:
          "Why do drivers need clear sight distance when approaching an intersection?",
        answers: [
          "To read street name boards",
          "To see cross-traffic early enough to stop, yield, or proceed safely",
          "To find parking near the junction",
          "To identify the number of lanes only",
        ],
        correctAnswer: 2,
        explanation:
          "At intersections, sight distance allows a driver to spot vehicles or pedestrians approaching from other directions in time to react safely.",
      },
    ],
  },
  "6": {
    type: "question",
    games: [
      {
        question:
          "As a general driving regulation in India, which side of the road should a vehicle normally be driven on?",
        answers: [
          "Right side",
          "Middle of the road",
          "Left side",
          "Whichever side has less traffic",
        ],
        correctAnswer: 3,
        explanation:
          "Vehicles must keep to the left side of the road at all times, moving right only briefly to overtake, then returning left immediately after.",
      },
      {
        question:
          "What must a driver do when the traffic light shows a steady red signal?",
        answers: [
          "Slow down and proceed if the road looks clear",
          "Stop completely behind the stop line",
          "Proceed with caution",
          "Sound the horn and continue",
        ],
        correctAnswer: 2,
        explanation:
          "A steady red light is an absolute command to stop completely behind the stop line until the signal changes to green.",
      },
      {
        question:
          "What does a flashing yellow/amber automatic traffic light typically instruct drivers to do?",
        answers: [
          "Stop completely, as with a red light",
          "Proceed with caution, giving way to pedestrians and other traffic",
          'Treat it as "no entry"',
          "Only left turns are allowed",
        ],
        correctAnswer: 2,
        explanation:
          "A flashing amber signal means drivers may proceed but must slow down and watch carefully for pedestrians and crossing traffic.",
      },
      {
        question:
          "What does a broken (dashed) white line in the centre of the road indicate?",
        answers: [
          "Overtaking is strictly prohibited",
          "Overtaking is permitted when the road ahead is clear and safe",
          "The road is one-way only",
          "A pedestrian crossing lies ahead",
        ],
        correctAnswer: 2,
        explanation:
          "A broken centre line means you may cross it to overtake or change lanes when safe, unlike a solid line which prohibits crossing.",
      },
      {
        question:
          "What does a continuous yellow line on the edge or centre of a road generally indicate?",
        answers: [
          "Overtaking is always allowed",
          "A no-overtaking/no-crossing zone or parking restriction, depending on placement",
          "It's purely decorative",
          "It indicates a pedestrian zone",
        ],
        correctAnswer: 2,
        explanation:
          'Yellow lines typically mark restrictions — a centre yellow line often prohibits overtaking, while yellow edge lines can indicate "no parking" or "no stopping" zones.',
      },
      {
        question:
          "What is the primary purpose of lane markings on a multi-lane road?",
        answers: [
          "To decorate the road surface",
          "To guide vehicles to stay within a defined path and organize traffic into orderly lanes",
          "To indicate speed limits",
          "To show where potholes are located",
        ],
        correctAnswer: 2,
        explanation:
          "Lane markings define separate paths for vehicles, reducing side collisions and helping drivers maintain lane discipline, especially at higher speeds.",
      },
      {
        question: 'What is a "stop line" used for at a signal or junction?',
        answers: [
          "It marks where drivers should start accelerating",
          "It marks the exact point behind which a vehicle must halt at a red light or stop sign",
          "It indicates a pedestrian crossing only",
          "It's used only for parking",
        ],
        correctAnswer: 2,
        explanation:
          "The stop line marks the boundary a vehicle must not cross when stopping at a signal, sign, or junction, keeping the junction and any crossing clear.",
      },
      {
        question:
          'What does "lane discipline" mean for a driver on a multi-lane road?',
        answers: [
          "Switching lanes frequently to move faster",
          "Choosing the correct lane for your speed/turn and staying in it without unnecessary weaving",
          "Always driving in the rightmost lane",
          "Ignoring lane markings when traffic is light",
        ],
        correctAnswer: 2,
        explanation:
          "Good lane discipline means picking the appropriate lane for your intended direction or speed and sticking to it, signaling clearly before any lane change.",
      },
    ],
  },
  "7": {
    type: "question",
    games: [
      {
        question:
          "What is the correct safety practice for vehicles approaching a railway level crossing?",
        answers: [
          "Park as close to the barrier/gate as possible to save time",
          "Stop at a safe distance before the marked stop line and never queue on the tracks",
          "Only heavy vehicles need to maintain a safe distance",
          "Distance rules only apply if there is no gate present",
        ],
        correctAnswer: 2,
        explanation:
          "Stopping well clear of the tracks ensures you're never stranded on the crossing if traffic ahead doesn't move or a train approaches.",
      },
      {
        question: 'What is a "road junction"?',
        answers: [
          "A section of road with no traffic",
          "A point where two or more roads meet or cross",
          "A road with a single continuous lane",
          "A dead-end street",
        ],
        correctAnswer: 2,
        explanation:
          "A junction is any point where roads meet, cross, or merge, requiring drivers to slow down, observe, and give way according to junction rules.",
      },
      {
        question: 'In a "T junction," how many roads typically meet?',
        answers: [
          "Two roads meeting end to end (a straight road)",
          'Three roads meeting to form a "T" shape',
          "Four roads crossing at one point",
          "Five or more roads",
        ],
        correctAnswer: 2,
        explanation:
          'A T junction is formed where a minor road meets a major road at roughly a right angle, resembling the letter "T," and traffic on the minor road usually must give way.',
      },
      {
        question: 'What makes a junction "controlled"?',
        answers: [
          "It has no signs or signals at all",
          "Traffic movement is regulated by signals, signs, or a traffic police officer",
          "Only pedestrians can use it",
          "It is closed to vehicles during the day",
        ],
        correctAnswer: 2,
        explanation:
          "A controlled junction uses traffic lights, stop/give-way signs, or an officer directing traffic to manage the right of way between conflicting streams.",
      },
      {
        question:
          "At an uncontrolled junction with no signs or signals, what is the general rule?",
        answers: [
          "The fastest vehicle gets priority",
          "Drivers must slow down, observe carefully, and generally give way to traffic on the right (as per local rules)",
          "Only two-wheelers must stop",
          "Vehicles from the left always have priority regardless of local rule",
        ],
        correctAnswer: 2,
        explanation:
          "With no signals or signs to regulate it, an uncontrolled junction relies on drivers slowing down and following the standard right-of-way convention used locally.",
      },
    ],
  },
  "8": {
    type: "question",
    games: [
      {
        question:
          "When a driver extends their right arm straight out horizontally to the side, what are they signaling?",
        answers: [
          "Slowing down",
          "Intention to turn right",
          "Intention to turn left",
          "Stopping completely",
        ],
        correctAnswer: 2,
        explanation:
          "A straight, horizontally extended right arm indicates an intended right turn to other road users when indicators aren't visible or used.",
      },
      {
        question:
          "When a traffic constable stands facing you with one arm raised straight up vertically, what does this signal mean?",
        answers: [
          "Proceed straight ahead",
          "You may turn left freely",
          "Stop — all traffic from every direction must halt",
          "Speed up to clear the intersection",
        ],
        correctAnswer: 3,
        explanation:
          "An arm raised vertically upward signals all vehicles approaching from every direction to stop, usually just before the traffic flow is changed.",
      },
      {
        question:
          "What must a driver do when approaching a zebra crossing with pedestrians waiting to cross?",
        answers: [
          "Speed up to cross before them",
          "Slow down and stop to give way to pedestrians on the crossing",
          "Sound the horn to make them wait",
          "Only stop if a policeman is present",
        ],
        correctAnswer: 2,
        explanation:
          "A zebra crossing gives pedestrians the right of way; drivers must stop and let them cross safely, regardless of police presence.",
      },
      {
        question:
          'What does "anticipation" mean in the context of safe driving?',
        answers: [
          "Driving as fast as possible to reach the destination early",
          "Reading the road ahead and predicting the actions of other road users before they happen",
          "Waiting for other drivers to signal before you react",
          "Only reacting after something happens",
        ],
        correctAnswer: 2,
        explanation:
          "Anticipation means scanning the road continuously and predicting hazards or other road users' moves, allowing earlier, safer reactions.",
      },
      {
        question:
          "What should a driver do when approaching a bus stop where a bus is pulling in (ingress)?",
        answers: [
          "Overtake the bus quickly before it stops",
          "Slow down and be prepared to stop, watching for pedestrians crossing toward the bus",
          "Sound the horn continuously",
          "Maintain normal speed since buses always stop close to the curb",
        ],
        correctAnswer: 2,
        explanation:
          "As a bus enters a stop, pedestrians often cross the road to board it, so approaching vehicles must slow down and stay alert.",
      },
      {
        question:
          "When a bus is leaving a bus stop (egress) and signaling to merge back into traffic, what should following drivers do?",
        answers: [
          "Speed up to pass before the bus merges",
          "Slow down and allow the bus to merge safely into the traffic flow",
          "Ignore the bus's indicator",
          "Overtake on the left side only",
        ],
        correctAnswer: 2,
        explanation:
          "Buses re-entering traffic have limited maneuverability, so drivers behind should ease off and let the bus merge safely rather than blocking or squeezing past it.",
      },
      {
        question:
          "What is the correct general method for driving near a designated bus stop area?",
        answers: [
          "Park in the bus bay if it looks empty",
          "Keep the bus bay clear, slow down, and watch for pedestrians boarding or alighting",
          "Use the bus bay as an overtaking lane",
          "Treat it the same as any regular stretch of road with no extra caution",
        ],
        correctAnswer: 2,
        explanation:
          "Bus stop zones require reduced speed and heightened awareness for pedestrian movement, and the bus bay itself should be kept clear for buses.",
      },
      {
        question:
          "When you notice a visually or hearing-impaired pedestrian near the road, what should a driver do?",
        answers: [
          "Proceed at normal speed since they'll hear the vehicle",
          "Slow down significantly and give extra space, since they may not sense the vehicle's approach",
          "Honk loudly to alert them",
          "Only be cautious if a caregiver is visible",
        ],
        correctAnswer: 2,
        explanation:
          "Pedestrians with visual or hearing impairments may not be aware of an approaching vehicle in the usual way, so drivers must slow down and give them extra safety margin.",
      },
      {
        question:
          "Why should drivers exercise extra caution around elderly pedestrians or women accompanying small children?",
        answers: [
          "They always have the legal right of way regardless of situation",
          "They may move slower or less predictably, needing more time and space to cross safely",
          "It's only a courtesy, not a safety concern",
          "No special caution is needed if they are on the footpath",
        ],
        correctAnswer: 2,
        explanation:
          "Elderly people and those accompanying young children often move more slowly or unpredictably, so drivers should slow down and allow extra time/space near them.",
      },
      {
        question:
          "How should a driver behave when approaching a slow-moving vehicle (e.g. a cart or tractor) ahead?",
        answers: [
          "Tailgate closely to pressure it to move faster",
          "Reduce speed, keep a safe following distance, and overtake only when it's safe and legal to do so",
          "Overtake immediately regardless of oncoming traffic",
          "Flash headlights repeatedly instead of slowing down",
        ],
        correctAnswer: 2,
        explanation:
          "Slow-moving vehicles require patience — maintaining distance and overtaking only with clear visibility and space prevents collisions.",
      },
      {
        question:
          "Why do two-wheelers require extra attention from car/truck drivers, especially when changing lanes?",
        answers: [
          "They are always faster than cars",
          "They are smaller, can be in blind spots, and are more vulnerable in a collision",
          "They aren't allowed to share the road with cars",
          "They always have right of way over all other vehicles",
        ],
        correctAnswer: 2,
        explanation:
          "Two-wheelers are harder to spot due to their smaller size and can occupy a driver's blind spot, and riders have far less protection in a collision.",
      },
      {
        question:
          "What driving consideration is important around autos and tempos, which often make sudden stops or turns?",
        answers: [
          "Assume they will always signal well in advance",
          "Maintain extra following distance and anticipate sudden stops or turns",
          "Overtake them at every opportunity without checking mirrors",
          "Treat them exactly like heavy trucks in terms of stopping distance",
        ],
        correctAnswer: 2,
        explanation:
          "Autos and tempos often stop or turn abruptly to pick up/drop passengers or goods, so extra caution and following distance help avoid rear-end collisions.",
      },
      {
        question:
          "Why is it important to keep extra distance behind large buses and trucks?",
        answers: [
          "They have better brakes than cars, so a short distance is fine",
          "They block your view ahead and take longer to stop, so more distance and visibility are needed",
          "It's only relevant on highways, not city roads",
          "It's purely a legal formality with no safety benefit",
        ],
        correctAnswer: 2,
        explanation:
          "Buses and trucks obstruct forward visibility and have longer stopping distances due to their size and load, so extra gap improves your reaction time and sightline.",
      },
      {
        question:
          "What should a driver do when they hear or see an ambulance or fire engine approaching with its siren/lights on?",
        answers: [
          "Maintain the current lane and speed",
          "Safely move aside and give way as quickly as possible to let it pass",
          "Speed up to clear the intersection before it arrives",
          "Only give way if it is directly behind you",
        ],
        correctAnswer: 2,
        explanation:
          "Emergency vehicles with active sirens/lights have priority; drivers must safely clear a path as soon as possible since delays can cost lives.",
      },
      {
        question:
          "What is the safest way to handle an animal (e.g. a stray cow or dog) suddenly on the road ahead?",
        answers: [
          "Swerve sharply without checking surroundings",
          "Slow down well in advance and pass carefully, avoiding sudden braking or swerving that could cause a collision",
          "Sound the horn loudly and continue at the same speed",
          "Speed up to pass before the animal reacts",
        ],
        correctAnswer: 2,
        explanation:
          "Animals can move unpredictably, so slowing down early and passing cautiously reduces the risk of a collision or a sudden, dangerous maneuver.",
      },
    ],
  },
  "9": {
    type: "question",
    games: [
      {
        question:
          "What is the main purpose of a traffic island or roundabout at a junction?",
        answers: [
          "To provide extra parking space",
          "To organize and separate traffic flows, guiding vehicles safely around the junction",
          "To display advertisements",
          "To increase vehicle speed through the junction",
        ],
        correctAnswer: 2,
        explanation:
          "Traffic islands and roundabouts channel vehicles into a circulating, one-directional flow, reducing conflict points and forcing lower speeds at junctions.",
      },
      {
        question: "What is the function of a road median?",
        answers: [
          "To provide extra lanes for overtaking",
          "To physically separate opposing traffic flows, improving safety",
          "To mark the end of a road",
          "To indicate a school zone",
        ],
        correctAnswer: 2,
        explanation:
          "A median (raised or painted) divides opposing traffic directions, reducing head-on collision risk and controlling where vehicles can cross or turn.",
      },
      {
        question: "What is the primary purpose of a bypass road?",
        answers: [
          "To connect two parking lots",
          "To route through-traffic around a congested town/city area instead of through it",
          "To provide a pedestrian-only path",
          "To slow down highway traffic intentionally",
        ],
        correctAnswer: 2,
        explanation:
          "A bypass diverts through-traffic away from congested urban centers, reducing travel time and easing congestion within the town itself.",
      },
      {
        question: 'How does a "Y junction" typically differ from a T junction?',
        answers: [
          "It has four arms instead of three",
          'Roads meet at an angle (not a right angle), forming a "Y" shape',
          "It only occurs on highways",
          "There is no need to give way at a Y junction",
        ],
        correctAnswer: 2,
        explanation:
          "In a Y junction, roads merge or diverge at an angle rather than perpendicularly, often requiring careful merging judgment since visibility angles differ from a T junction.",
      },
      {
        question: 'A "4-arm junction" refers to a junction where:',
        answers: [
          "Only two roads cross",
          "Four roads meet at a single point, typically forming a crossroads",
          "There is a roundabout in the middle",
          "Only pedestrians are allowed to cross",
        ],
        correctAnswer: 2,
        explanation:
          "A 4-arm (crossroads) junction has four approaching roads meeting at one point, requiring extra caution since traffic can arrive from all four directions.",
      },
      {
        question: 'What characterizes a "staggered junction"?',
        answers: [
          "All roads meet at exactly the same point",
          "Two T-junctions positioned close together but offset, so roads don't align directly opposite each other",
          "It has no traffic control at all",
          "It only exists on highways",
        ],
        correctAnswer: 2,
        explanation:
          "In a staggered junction, side roads meet the main road at slightly different points rather than directly across from each other, changing how drivers cross or turn.",
      },
    ],
  },
  "10": {
    type: "question",
    games: [
      {
        question:
          "In India, what is generally required before you can apply for a permanent driving licence?",
        answers: [
          "Directly apply without any prior step",
          "Hold a valid learner's licence for a minimum mandated period",
          "Only pass a written test with no practical test",
          "Only be above 25 years of age",
        ],
        correctAnswer: 2,
        explanation:
          "Applicants must first hold a learner's licence for a minimum required period (for supervised practice) before applying for and taking the permanent licence test.",
      },
      {
        question:
          "Which of the following is a common classification used for road accidents?",
        answers: [
          "Accidents are only classified by the color of vehicles involved",
          "By severity — such as fatal, grievous injury, minor injury, and non-injury (property damage only)",
          "By the time of year only",
          "Accidents cannot be classified in any way",
        ],
        correctAnswer: 2,
        explanation:
          "Road accidents are commonly classified by outcome severity (fatal, serious injury, minor injury, or damage-only), which helps in accident analysis and prevention planning.",
      },
      {
        question:
          "Which of these is one of the most commonly cited causes of road accidents?",
        answers: [
          "Following traffic signals correctly",
          "Driver error, such as speeding, distraction, or not maintaining a safe distance",
          "Using indicators before turning",
          "Wearing a seatbelt",
        ],
        correctAnswer: 2,
        explanation:
          "The majority of road accidents are attributed to human/driver error — speeding, distraction, fatigue, or following too closely — rather than mechanical or road factors alone.",
      },
      {
        question:
          "Which of the following is an effective preventive measure to reduce accident risk?",
        answers: [
          "Driving as close as possible to the vehicle ahead to save time",
          "Maintaining a safe following distance, obeying speed limits, and staying alert/undistracted",
          "Using a mobile phone while driving to stay connected",
          "Ignoring weather conditions while driving",
        ],
        correctAnswer: 2,
        explanation:
          "Safe following distance, adherence to speed limits, and staying focused/undistracted are core, proven ways individual drivers can reduce accident risk.",
      },
      {
        question:
          "What is a driver legally and ethically expected to do immediately after being involved in an accident?",
        answers: [
          "Leave the scene quickly to avoid delay",
          "Stop, check for injuries, help if possible, and report the accident as required by law",
          "Move the vehicle immediately regardless of injuries or evidence needs",
          "Only act if there is visible vehicle damage",
        ],
        correctAnswer: 2,
        explanation:
          "A driver involved in an accident must stop, assist any injured persons, and report the incident to authorities as legally required — leaving the scene can constitute a serious offense.",
      },
    ],
  },
} satisfies Record<string, QuestionGame>;
