import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";

const MAX_CHAR_LIMIT = 1024;

// Define the colors based on the user's provided palette
const PRIMARY_COLOR = "#6257FF"; // Using Car Condition blue for primary elements
const SECONDARY_COLOR = "#B28FFF"; // Using More Guidance purple for secondary elements
const TERTIARY_COLOR = "#FFC229"; // Using Lesson Duration yellow for main rating

// NEW HELPER COMPONENT: StarRating (Updated with specific colors)
const StarRating = ({ value, setValue, maxStars = 5 }) => {
  // Assuming useState is imported
  const [hover, setHover] = useState(null);
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <div className="flex space-x-1">
      {stars.map((star) => {
        const ratingValue = star;
        const isSelected = (hover || value) >= ratingValue;

        return (
          <button
            key={star}
            type="button"
            onClick={() => setValue(ratingValue === value ? 0 : ratingValue)}
            onMouseEnter={() => setHover(ratingValue)}
            onMouseLeave={() => setHover(null)}
            className={`text-2xl transition-colors`}
            // FIX 1: Using the defined primary color for stars
            style={{ color: isSelected ? PRIMARY_COLOR : "#9ca3af" }}
          >
            ★
          </button>
        );
      })}
      <span className="ml-2 self-center text-sm font-semibold text-gray-700">
        ({value} / 5)
      </span>
    </div>
  );
};

export default function LessonReview() {
  const [rating, setRating] = useState(0); // Changed initial rating to 0 for validation
  const [hover, setHover] = useState(null);
  const [selectedButtons, setSelectedButtons] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");

  // Performance Rating States (0-5)
  const [clutchBrakeRating, setClutchBrakeRating] = useState(0);
  const [distanceMatchRating, setDistanceMatchRating] = useState(0);
  const [parkingRating, setParkingRating] = useState(0);

  // Car Buying Intent States
  const [planningToBuy, setPlanningToBuy] = useState(null);
  const [carType, setCarType] = useState(null);
  const [carCondition, setCarCondition] = useState(null);
  const [buyTimeframe, setBuyTimeframe] = useState(null);

  // FIX 3: State for button enabling/disabling
  const [formIsValid, setFormIsValid] = useState(false);

  // Helper Data
  const carTypeOptions = ["Hatchback", "Sedan", "SUV"];
  const conditionOptions = ["New", "Used"];
  const timeframeOptions = [
    "0-3 Months",
    "3-6 Months",
    "6-12 Months",
    "1+ Year",
    "Not Sure",
  ];

  const buttons = [
    { id: 1, color: "#00CE84" },
    { id: 2, color: "#B28FFF" },
    { id: 3, color: "#6257FF" },
    { id: 4, color: "#00FF91" },
    { id: 5, color: "#FFC229" },
    { id: 6, color: "#6BECFF" },
  ];

  // FIX 4: Validation logic
  // Checks if the main rating and all performance ratings are selected (i.e., not 0)
  const validateForm = () => {
    const isValid =
      rating > 0 &&
      clutchBrakeRating > 0 &&
      distanceMatchRating > 0 &&
      parkingRating > 0;
    setFormIsValid(isValid);
    return isValid;
  };

  // Use effect to run validation whenever critical state changes
  useEffect(() => {
    validateForm();
  }, [rating, clutchBrakeRating, distanceMatchRating, parkingRating]);

  const handleRatingMessage = () => {
    if (rating !== null) {
      if (rating < 3) return "Not Good";
      if (rating === 3) return "Decent";
      if (rating > 3) return "Excellent";
    }
    return "";
  };

  const handleButtonClick = (buttonText) => {
    setSelectedButtons((prevSelected) => {
      if (prevSelected.includes(buttonText)) {
        return prevSelected.filter((text) => text !== buttonText);
      }
      return [...prevSelected, buttonText];
    });
  };

  const handleFeedbackChange = (e) => {
    const newText = e.target.value;

    if (newText.length > MAX_CHAR_LIMIT) {
      alert(`Character limit of ${MAX_CHAR_LIMIT} exceeded!`);
      setFeedbackText(newText.substring(0, MAX_CHAR_LIMIT));
    } else {
      setFeedbackText(newText);
    }
  };

  const handleSubmit = () => {
    if (!formIsValid) {
      console.error(
        "❌ Form validation failed. Please complete all required ratings.",
      );
      return;
    }

    const finalFeedback = {
      lessonRating: rating,
      performance: {
        clutchBrakeRating,
        distanceMatchRating,
        parkingRating,
      },
      carBuyingIntent: {
        planningToBuy: planningToBuy,
        carType: planningToBuy === "Yes" ? carType : null,
        carCondition: planningToBuy === "Yes" ? carCondition : null,
        buyTimeframe: planningToBuy === "Yes" ? buyTimeframe : null,
      },
      improvedAreas: selectedButtons,
      textFeedback: feedbackText,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Final Feedback Submitted:", finalFeedback);
  };

  return (
    <PurpleGradient>
      <div className="flex h-full w-full flex-col overflow-y-auto p-6">
        <div className="relative mb-6 shrink-0 overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* Main Rating Card */}
          <div className="flex flex-col items-center justify-center rounded-lg p-6">
            <h1 className="mb-4 text-2xl font-bold">
              Rate Us {rating === 0 && <span className="text-red-500">*</span>}
            </h1>
            <div className="mb-4 flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                  }}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  className={`text-3xl ${
                    (hover || rating) >= star
                      ? // FIX 1: Using the tertiary color for the main rating stars
                        "text-yellow-500" // Tertiary color close enough to yellow-500
                      : "text-gray-400"
                  }`}
                  // Using Tertiary color for the main rating
                  style={{
                    color:
                      (hover || rating) >= star ? TERTIARY_COLOR : "#9ca3af",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="text-lg font-semibold">
              {rating !== null ? handleRatingMessage() : "Select a rating"}
            </div>
          </div>

          {/* Performance Rating Section (Now using StarRating) */}
          <div className="mt-6 rounded-lg border-t bg-white p-6">
            <h2 className="mb-4 text-center text-lg font-semibold">
              🚗 Performance Rating
            </h2>

            <div className="flex items-center justify-between border-b py-2">
              <label className="w-2/3 text-sm font-medium text-gray-700">
                Controlling & Clutch-Brake Handling{" "}
                {clutchBrakeRating === 0 && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <StarRating
                value={clutchBrakeRating}
                setValue={setClutchBrakeRating}
              />
            </div>

            <div className="flex items-center justify-between border-b py-2">
              <label className="w-2/3 text-sm font-medium text-gray-700">
                Distance Matching Ability (between vehicles){" "}
                {distanceMatchRating === 0 && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <StarRating
                value={distanceMatchRating}
                setValue={setDistanceMatchRating}
              />
            </div>

            <div className="flex items-center justify-between py-2 last:border-b-0">
              <label className="w-2/3 text-sm font-medium text-gray-700">
                Parking Skill{" "}
                {parkingRating === 0 && <span className="text-red-500">*</span>}
              </label>
              <StarRating value={parkingRating} setValue={setParkingRating} />
            </div>
          </div>

          {/* Car Buying Intent Section */}
          <div className="mt-6 rounded-lg border-t bg-white p-6">
            <h2 className="mb-4 text-center text-lg font-semibold">
              🛒 Car Buying Intent
            </h2>

            {/* FIX 2: Fixed overlapping by ensuring label and buttons occupy defined space */}
            <div className="flex items-center justify-between border-b py-2">
              <label className="w-1/2 text-sm font-medium text-gray-700">
                Are you planning to buy a car?
              </label>

              <div className="flex w-1/2 justify-end space-x-2">
                {["Yes", "No"].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setPlanningToBuy(choice)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                      planningToBuy === choice
                        ? "text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    // FIX 1: Using the secondary color for the Yes/No buttons
                    style={{
                      backgroundColor:
                        planningToBuy === choice ? SECONDARY_COLOR : "#e5e7eb",
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Fields (If Yes) */}
            {planningToBuy === "Yes" && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b">
                  <label className="w-2/3 text-sm font-medium text-gray-700">
                    Type of Car
                  </label>
                  <select
                    value={carType || ""}
                    onChange={(e) => setCarType(e.target.value)}
                    className="form-select w-1/3 rounded-md border border-gray-300 p-1.5 text-right text-sm shadow-sm"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {carTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between border-b">
                  <label className="w-2/3 text-sm font-medium text-gray-700">
                    New or Used Car
                  </label>
                  <select
                    value={carCondition || ""}
                    onChange={(e) => setCarCondition(e.target.value)}
                    className="form-select w-1/3 rounded-md border border-gray-300 p-1.5 text-right text-sm shadow-sm"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {conditionOptions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between border-b pb-2">
                  <label className="w-2/3 text-sm font-medium text-gray-700">
                    When are they planning to buy?
                  </label>
                  <select
                    value={buyTimeframe || ""}
                    onChange={(e) => setBuyTimeframe(e.target.value)}
                    className="form-select w-1/3 rounded-md border border-gray-300 p-1.5 text-right text-sm shadow-sm"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {timeframeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Improvement Buttons and Feedback Card */}
          <div className="mt-10">
            <h2 className="text-center font-semibold">
              What could be improved?
            </h2>
            <div className="grid grid-cols-3 grid-rows-2 gap-4 p-6">
              {buttons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => handleButtonClick(button.text)}
                  style={{
                    borderColor: button.color,
                    backgroundColor: selectedButtons.includes(button.text)
                      ? button.color
                      : "#ffffff",
                    color: selectedButtons.includes(button.text)
                      ? "#ffffff"
                      : "#000000",
                  }}
                  className="rounded-sm border-2 px-1.5 py-0.5 text-xs transition-colors duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-700"
                >
                  {button.text}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6">
            <div className="mb-4 flex flex-row items-center justify-center gap-1.5 text-2xl font-bold">
              <p>Feedback</p>
            </div>

            <textarea
              value={feedbackText}
              onChange={handleFeedbackChange}
              maxLength={MAX_CHAR_LIMIT}
              className="h-32 w-full rounded-lg border border-gray-300 p-4"
              placeholder="Enter your feedback here..."
            />

            <p
              className={`mt-1 text-right text-sm ${
                feedbackText.length >= MAX_CHAR_LIMIT
                  ? "font-bold text-red-500"
                  : "text-gray-500"
              }`}
            >
              {feedbackText.length} / {MAX_CHAR_LIMIT} characters
            </p>
          </div>
        </div>

        {/* FIX 3: Disabled button until validation passes */}
        <Button
          onClick={handleSubmit}
          className={`mb-6 w-full shrink-0 ${!formIsValid ? "cursor-not-allowed opacity-50" : ""}`}
          variant={"purple"}
          disabled={!formIsValid}
        >
          Submit {formIsValid ? "" : "(Complete Ratings)"}
        </Button>
        {!formIsValid && (
          <p className="-mt-4 text-center text-sm text-red-500">
            Please complete all required ratings (*).
          </p>
        )}
      </div>
    </PurpleGradient>
  );
}

/**
 * Helper function to generate 5-star rating HTML using safe entities and inline styles for email compatibility.
 * @param {string|number} rating - The rating value (0-5).
 * @param {string} starColor - The color for active (filled) stars.
 * @returns {string} HTML string of styled stars.
 */
const generateStars = (rating, starColor) => {
  let stars = "";
  const fullStar = "&#9733;"; // ★
  // Note: The inactive star color (#ccc) is a neutral gray necessary for contrast and readability.
  const INACTIVE_STAR_COLOR = "#ccc";
  const numericRating = parseInt(rating) || 0;

  for (let i = 1; i <= 5; i++) {
    // Use inline color styling for reliability in email clients
    const color = i <= numericRating ? starColor : INACTIVE_STAR_COLOR;
    stars += `<span style="color:${color};font-size:16px;line-height:1;">${fullStar}</span>`;
  }
  return stars;
};

/**
 * Generates the complete, self-contained HTML document string for the Course Feedback email report.
 * This HTML is designed for maximum compatibility with email clients, using tables for layout
 * and inline styles, and avoiding external scripts or complex CSS.
 *
 * @param {object} feedbackData - The structured feedback data.
 * @param {string} customerName - The full name of the customer.
 * @returns {string} The complete HTML document string, ready to be passed to an email service.
 */
export const generateFeedbackReportHtml = (feedbackData, customerName) => {
  // Moved color constants into the function for modularity and reusability
  const PRIMARY_COLOR = "#00CE84"; // Main accent color
  const STAR_COLOR = "#6257FF"; // Star rating color (Active/Filled)
  // Light tint of the primary color for backgrounds/highlights
  const LIGHT_ACCENT_BG = "rgba(0, 206, 132, 0.08)"; // Light tint of PRIMARY_COLOR (00CE84)

  // ----------------------------------------------------------------------
  // 1. Map Core Questionnaire Data
  // ----------------------------------------------------------------------
  const {
    performance,
    carBuyingIntent,
    lessonRating,
    improvedAreas,
    textFeedback,
    timestamp,
    courseName,
  } = feedbackData;

  const clutchBrakeRating = performance?.clutchBrakeRating || "0";
  const distanceMatchRating = performance?.distanceMatchRating || "0";
  const parkingRating = performance?.parkingRating || "0";
  const planningToBuy = carBuyingIntent?.planningToBuy || "No";

  const carType = carBuyingIntent?.carType || "N/A";
  const carCondition = carBuyingIntent?.carCondition || "N/A";
  const buyTimeframe = carBuyingIntent?.buyTimeframe || "N/A";

  const courseNameValue = courseName || "N/A";

  // ----------------------------------------------------------------------
  // 2. Prepare Secondary Data
  // ----------------------------------------------------------------------
  const generatedTimestamp = new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Improved Areas List (using basic HTML list structure for email)
  const improvedAreasList =
    improvedAreas && improvedAreas.length > 0
      ? `<ul style="margin: 0; padding-left: 20px; color: #374151;">` +
        improvedAreas.map((area) => `<li>${area}</li>`).join("") +
        `</ul>`
      : `<p style="margin: 0; color: #9ca3af; font-style: italic;">No specific areas for improvement were highlighted.</p>`;

  // Conditional details block for car buying intent
  const intentDetailsBlock =
    planningToBuy === "Yes"
      ? `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 10px; border-left: 2px solid ${PRIMARY_COLOR}; padding-left: 10px;">
                <tr>
                    <td style="padding: 10px 0;">
                        <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #4b5563;">Targeting Details:</h3>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td width="33.3%" style="padding-right: 10px; padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Type of Car:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${carType}</p>
                                </td>
                                <td width="33.3%" style="padding-right: 10px; padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">New or Used Car:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${carCondition}</p>
                                </td>
                                <td width="33.3%" style="padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Planned Purchase Timeline:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${buyTimeframe}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `
      : `
            <div style="margin-top: 10px; border-left: 2px solid #d1d5db; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;">
                <p style="margin: 0; color: #9ca3af; font-style: italic; font-size: 14px;">You are not currently planning to buy a car.</p>
            </div>
        `;

  // ----------------------------------------------------------------------
  // 3. Section Containers (Reordered for UX: Skill -> Feedback -> Intent)
  // ----------------------------------------------------------------------

  // Section 1: Performance Rating
  const performanceSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">1. Skill Assessment Ratings (0-5)</h2>
            <div style="padding: 0; margin: 0;">
                
                ${[
                  {
                    label: "Controlling & Clutch-Brake Handling",
                    rating: clutchBrakeRating,
                  },
                  {
                    label: "Distance Matching Ability (between vehicles)",
                    rating: distanceMatchRating,
                  },
                  { label: "Parking Skill", rating: parkingRating },
                ]
                  .map(
                    (item) => `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 10px; background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding: 12px; font-size: 14px; color: #374151; font-weight: 500;">
                                ${item.label}
                            </td>
                            <td style="padding: 12px; text-align: right; white-space: nowrap;">
                                ${generateStars(item.rating, STAR_COLOR)}
                                <span style="margin-left: 8px; font-weight: 700; font-size: 16px; color: ${PRIMARY_COLOR};">(${item.rating}/5)</span>
                            </td>
                        </tr>
                    </table>
                `,
                  )
                  .join("")}

            </div>
        </div>
    `;

  // Section 2: Core Additional Feedback
  const feedbackSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">2. Core Additional Feedback</h2>
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td valign="top" class="col-left" style="width: 50%; padding-right: 15px;">
                        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #374151;">Open-Ended Comments</h3>
                        <div style="padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <p style="margin: 0; color: #1f2937; white-space: pre-wrap; font-size: 14px;">${textFeedback || "No additional comments provided."}</p>
                        </div>
                    </td>
                    <td valign="top" class="col-right" style="width: 50%; padding-left: 15px;">
                        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #374151;">Suggested Areas for Improvement</h3>
                        <div style="padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                            ${improvedAreasList}
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    `;

  // Section 3: Car Buying Intent
  const intentSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">3. Car Buying Intent Analysis</h2>
            
            <div style="padding: 15px; border-radius: 8px; border: 1px solid ${PRIMARY_COLOR}; background-color: ${LIGHT_ACCENT_BG};">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                    <tr>
                        <td style="padding-bottom: 5px;">
                            <p style="margin: 0; font-weight: 600; color: #374151; font-size: 14px;">Are you planning to buy a car?</p>
                        </td>
                        <td style="padding-bottom: 5px; text-align: right; white-space: nowrap;">
                            <p style="margin: 0; font-weight: 800; font-size: 18px; color: ${PRIMARY_COLOR};">${planningToBuy}</p>
                        </td>
                    </tr>
                </table>
                
                ${intentDetailsBlock}

            </div>
        </div>
    `;

  // ----------------------------------------------------------------------
  // 4. Main Report Container HTML String (Full Document)
  // ----------------------------------------------------------------------
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Feedback Report</title>
            <style>
                /* Universal Reset and Fonts for Email Clients */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', Helvetica, Arial, sans-serif;
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                    background-color: #f7f7f7;
                }
                table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                a { text-decoration: none; }
                p { margin: 0; }
                .ReadMsgBody { width: 100%; }
                .ExternalClass { width: 100%; }
                /* Responsive Styling for Mobile */
                @media only screen and (max-width: 600px) {
                    .main-content { width: 100% !important; }
                    .col-left, .col-right { width: 100% !important; display: block !important; padding-right: 0 !important; padding-left: 0 !important; margin-bottom: 15px; }
                }
            </style>
        </head>
        <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px;">
            <center>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding: 0 0 20px 0; text-align: center;">
                            <!-- Main Report Card Container -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="main-content" style="background-color: #ffffff; border-radius: 12px; border-top: 8px solid ${PRIMARY_COLOR}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
                                <tr>
                                    <td style="padding: 32px 32px 24px 32px;">
                                        
                                        <!-- Header -->
                                        <h1 style="margin: 0 0 5px; font-size: 28px; font-weight: 800; color: #1f2937;">Course Feedback</h1>
                                        <div style="border-bottom: 1px solid #e5eeeb; padding-bottom: 15px; margin-bottom: 25px;"></div>

                                        <!-- Service & Customer Details -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #f9fafb; border-radius: 8px; padding: 15px;">
                                            <tr>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Customer Name:</p>
                                                    <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 800;">${customerName}</p>
                                                </td>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Course Name:</p>
                                                    <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 800;">${courseNameValue}</p>
                                                </td>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Overall Rating:</p>
                                                    <p style="margin: 0; font-size: 16px; color: ${PRIMARY_COLOR}; font-weight: 700;">${lessonRating}/5</p>
                                                </td>
                                                <td width="25%">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Date Submitted:</p>
                                                    <p style="margin: 0; font-size: 14px; color: #1f2937; font-weight: 700;">${generatedTimestamp}</p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Report Sections (In new order) -->
                                        ${performanceSection}
                                        ${feedbackSection}
                                        ${intentSection}

                                        <!-- Footer -->
                                        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
                                            <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280;">Report Generated: ${generatedTimestamp}.</p>
                                            <p style="margin: 0; font-size: 14px; color: ${PRIMARY_COLOR}; font-weight: 600;">Thank you for choosing our service.</p>
                                        </div>

                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
    `;
};
