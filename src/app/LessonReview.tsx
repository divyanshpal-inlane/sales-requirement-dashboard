import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";

const MAX_CHAR_LIMIT = 1024; 

// Define the colors based on the user's provided palette
const PRIMARY_COLOR = '#6257FF'; // Using Car Condition blue for primary elements
const SECONDARY_COLOR = '#B28FFF'; // Using More Guidance purple for secondary elements
const TERTIARY_COLOR = '#FFC229'; // Using Lesson Duration yellow for main rating

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
                        style={{ color: isSelected ? PRIMARY_COLOR : '#9ca3af' }} 
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
  const carTypeOptions = ['Hatchback', 'Sedan', 'SUV'];
  const conditionOptions = ['New', 'Used'];
  const timeframeOptions = ['0-3 Months', '3-6 Months', '6-12 Months', '1+ Year', 'Not Sure'];

  const buttons = [
    { id: 1, color: "#00CE84", text: "Better Lesson" },
    { id: 2, color: "#B28FFF", text: "More Guidance" },
    { id: 3, color: "#6257FF", text: "Car Condition" },
    { id: 4, color: "#00FF91", text: "Safety" },
    { id: 5, color: "#FFC229", text: "Lesson Duration" },
    { id: 6, color: "#6BECFF", text: "Others" },
  ];
  
  // FIX 4: Validation logic
  // Checks if the main rating and all performance ratings are selected (i.e., not 0)
  const validateForm = () => {
      const isValid = rating > 0 && clutchBrakeRating > 0 && distanceMatchRating > 0 && parkingRating > 0;
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
    setSelectedButtons(prevSelected => {
      if (prevSelected.includes(buttonText)) {
        return prevSelected.filter(text => text !== buttonText);
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
        console.error("❌ Form validation failed. Please complete all required ratings.");
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
        carType: planningToBuy === 'Yes' ? carType : null,
        carCondition: planningToBuy === 'Yes' ? carCondition : null,
        buyTimeframe: planningToBuy === 'Yes' ? buyTimeframe : null,
      },
      improvedAreas: selectedButtons, 
      textFeedback: feedbackText,
      timestamp: new Date().toISOString(),
    };
    
    console.log('✅ Final Feedback Submitted:', finalFeedback);
  };

  return (
    <PurpleGradient>
      <div className="flex h-full w-full flex-col overflow-y-auto p-6">
        <div className="relative mb-6 shrink-0 overflow-hidden rounded-3xl bg-white shadow-lg">
          
          {/* Main Rating Card */}
          <div className="flex flex-col items-center justify-center rounded-lg p-6">
            <h1 className="mb-4 text-2xl font-bold">Rate Us {rating === 0 && <span className="text-red-500">*</span>}</h1>
            <div className="mb-4 flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => { setRating(star); }}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  className={`text-3xl ${
                    (hover || rating) >= star
                      // FIX 1: Using the tertiary color for the main rating stars
                      ? 'text-yellow-500' // Tertiary color close enough to yellow-500
                      : "text-gray-400"
                  }`}
                  // Using Tertiary color for the main rating
                  style={{ color: (hover || rating) >= star ? TERTIARY_COLOR : '#9ca3af' }}
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
          <div className="mt-6 rounded-lg bg-white p-6 border-t">
            <h2 className="text-center font-semibold mb-4 text-lg">
              🚗 Performance Rating
            </h2>
            
            <div className="flex justify-between items-center py-2 border-b">
              <label className="text-sm font-medium text-gray-700 w-2/3">Controlling & Clutch-Brake Handling {clutchBrakeRating === 0 && <span className="text-red-500">*</span>}</label>
              <StarRating value={clutchBrakeRating} setValue={setClutchBrakeRating} />
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <label className="text-sm font-medium text-gray-700 w-2/3">Distance Matching Ability (between vehicles) {distanceMatchRating === 0 && <span className="text-red-500">*</span>}</label>
              <StarRating value={distanceMatchRating} setValue={setDistanceMatchRating} />
            </div>
            
            <div className="flex justify-between items-center py-2 last:border-b-0">
              <label className="text-sm font-medium text-gray-700 w-2/3">Parking Skill {parkingRating === 0 && <span className="text-red-500">*</span>}</label>
              <StarRating value={parkingRating} setValue={setParkingRating} />
            </div>
          </div>

          {/* Car Buying Intent Section */}
          <div className="mt-6 rounded-lg bg-white p-6 border-t">
            <h2 className="text-center font-semibold mb-4 text-lg">
              🛒 Car Buying Intent
            </h2>
            
            {/* FIX 2: Fixed overlapping by ensuring label and buttons occupy defined space */}
            <div className="flex justify-between items-center py-2 border-b">
              <label className="text-sm font-medium text-gray-700 w-1/2">Are you planning to buy a car?</label>
              
              <div className="flex space-x-2 w-1/2 justify-end">
                {['Yes', 'No'].map(choice => (
                    <button
                        key={choice}
                        type="button"
                        onClick={() => setPlanningToBuy(choice)}
                        className={`py-1 px-3 rounded-full text-xs font-semibold transition-colors duration-150 ${
                            planningToBuy === choice
                                ? 'text-white shadow-md' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        }`}
                        // FIX 1: Using the secondary color for the Yes/No buttons
                        style={{ backgroundColor: planningToBuy === choice ? SECONDARY_COLOR : '#e5e7eb' }}
                    >
                        {choice}
                    </button>
                ))}
              </div>
            </div>

            {/* Conditional Fields (If Yes) */}
            {planningToBuy === 'Yes' && (
              <div className="space-y-2 pt-2">
                
                <div className="flex justify-between items-center border-b">
                  <label className="text-sm font-medium text-gray-700 w-2/3">Type of Car</label>
                  <select
                    value={carType || ''}
                    onChange={(e) => setCarType(e.target.value)}
                    className="form-select border border-gray-300 rounded-md shadow-sm p-1.5 text-sm w-1/3 text-right"
                  >
                    <option value="" disabled>Select</option>
                    {carTypeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center border-b">
                  <label className="text-sm font-medium text-gray-700 w-2/3">New or Used Car</label>
                  <select
                    value={carCondition || ''}
                    onChange={(e) => setCarCondition(e.target.value)}
                    className="form-select border border-gray-300 rounded-md shadow-sm p-1.5 text-sm w-1/3 text-right"
                  >
                    <option value="" disabled>Select</option>
                    {conditionOptions.map(condition => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center border-b pb-2">
                  <label className="text-sm font-medium text-gray-700 w-2/3">When are they planning to buy?</label>
                  <select
                    value={buyTimeframe || ''}
                    onChange={(e) => setBuyTimeframe(e.target.value)}
                    className="form-select border border-gray-300 rounded-md shadow-sm p-1.5 text-sm w-1/3 text-right"
                  >
                    <option value="" disabled>Select</option>
                    {timeframeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
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
                    backgroundColor:
                      selectedButtons.includes(button.text) ? button.color : "#ffffff",
                    color: selectedButtons.includes(button.text) ? "#ffffff" : "#000000",
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
            
            <p className={`text-right text-sm mt-1 ${
                feedbackText.length >= MAX_CHAR_LIMIT ? "text-red-500 font-bold" : "text-gray-500"
            }`}>
              {feedbackText.length} / {MAX_CHAR_LIMIT} characters
            </p>
          </div>
        </div>

        {/* FIX 3: Disabled button until validation passes */}
        <Button 
            onClick={handleSubmit} 
            className={`w-full shrink-0 mb-6 ${!formIsValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            variant={"purple"}
            disabled={!formIsValid}
        >
          Submit {formIsValid ? '' : '(Complete Ratings)'}
        </Button>
        {!formIsValid && <p className="text-center text-sm text-red-500 -mt-4">Please complete all required ratings (*).</p>}
      </div>
    </PurpleGradient>
  );
}

// export default function LessonReview() {
//   // Assuming all hooks (useState, etc.) are imported.
  
//   const [rating, setRating] = useState(4);
//   const [hover, setHover] = useState(null);
//   const [selectedButtons, setSelectedButtons] = useState([]);
//   const [feedbackText, setFeedbackText] = useState(""); 

//   const buttons = [
//     { id: 1, color: "#00CE84", text: "Better Lesson" },
//     { id: 2, color: "#B28FFF", text: "More Guidance" },
//     { id: 3, color: "#6257FF", text: "Car Condition" },
//     { id: 4, color: "#00FF91", text: "Safety" },
//     { id: 5, color: "#FFC229", text: "Lesson Duration" },
//     { id: 6, color: "#6BECFF", text: "Others" },
//   ];

//   const handleRatingMessage = () => {
//     if (rating !== null) {
//       if (rating < 3) return "Not Good";
//       if (rating === 3) return "Decent";
//       if (rating > 3) return "Excellent";
//     }
//     return "";
//   };

//   const handleButtonClick = (buttonId) => {
//     setSelectedButtons(prevSelected => {
//       if (prevSelected.includes(buttonId)) {
//         return prevSelected.filter(id => id !== buttonId);
//       }
//       return [...prevSelected, buttonId];
//     });
//   };

//   const handleFeedbackChange = (e) => {
//     const newText = e.target.value;
    
//     if (newText.length > MAX_CHAR_LIMIT) {
//       alert(`Character limit of ${MAX_CHAR_LIMIT} exceeded!`);
//       setFeedbackText(newText.substring(0, MAX_CHAR_LIMIT));
//     } else {
//       setFeedbackText(newText);
//     }
//   };

//   const handleSubmit = () => {
//     const finalFeedback = {
//       rating: rating,
//       improvedAreas: selectedButtons,
//       textFeedback: feedbackText,
//       timestamp: new Date().toISOString(),
//     };
    
//     console.log('✅ Final Feedback Submitted:', finalFeedback);
//   };

//   return (
//     <PurpleGradient>
//       <div className="flex h-full w-full flex-col overflow-y-auto p-6">
//         <div className="relative mb-6 shrink-0 overflow-hidden rounded-3xl bg-white shadow-lg">
//           {/* Stars card */}
//           <div className="flex flex-col items-center justify-center rounded-lg p-6">
//             <h1 className="mb-4 text-2xl font-bold">Rate Us</h1>
//             <div className="mb-4 flex space-x-2">
//               {[1, 2, 3, 4, 5].map((star) => (
//                 <button
//                   key={star}
//                   type="button"
//                   onClick={() => setRating(star)}
//                   onMouseEnter={() => setHover(star)}
//                   onMouseLeave={() => setHover(null)}
//                   className={`text-3xl ${
//                     (hover || rating) >= star
//                       ? "text-yellow-500"
//                       : "text-gray-400"
//                   }`}
//                 >
//                   ★
//                 </button>
//               ))}
//             </div>
//             <div className="text-lg font-semibold">
//               {rating !== null ? handleRatingMessage() : "Select a rating"}
//             </div>
//             {rating && (
//               <div className="mt-4 text-sm text-gray-600">
//                 You rated us {rating} out of 5 stars!
//               </div>
//             )}
//           </div>
          
//           {/* What could be improved? */}
//           <div className="mt-10">
//             <h2 className="text-center font-semibold">
//               What could be improved?
//             </h2>
//             <div className="grid grid-cols-3 grid-rows-2 gap-4 p-6">
//               {buttons.map((button) => (
//                 <button
//                   key={button.id}
//                   onClick={() => handleButtonClick(button.id)}
//                   style={{
//                     borderColor: button.color,
//                     backgroundColor:
//                       selectedButtons.includes(button.id) ? button.color : "#ffffff",
//                     color: selectedButtons.includes(button.id) ? "#ffffff" : "#000000",
//                   }}
//                   className="rounded-sm border-2 px-1.5 py-0.5 text-xs transition-colors duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-700"
//                 >
//                   {button.text}
//                 </button>
//               ))}
//             </div>
//           </div>
          
//           {/* Feedback Card */}
//           <div className="mt-6 rounded-lg bg-white p-6">
//             <div className="mb-4 flex flex-row items-center justify-center gap-1.5 text-2xl font-bold">
//               <p>Feedback</p>
//             </div>
            
//             <textarea
//               value={feedbackText}
//               onChange={handleFeedbackChange}
//               maxLength={MAX_CHAR_LIMIT} 
//               className="h-32 w-full rounded-lg border border-gray-300 p-4"
//               placeholder="Enter your feedback here..."
//             />
            
//             <p className={`text-right text-sm mt-1 ${
//                 feedbackText.length >= MAX_CHAR_LIMIT ? "text-red-500 font-bold" : "text-gray-500"
//             }`}>
//               {feedbackText.length} / {MAX_CHAR_LIMIT} characters
//             </p>
//           </div>
//         </div>

//         <Button onClick={handleSubmit} className="w-full shrink-0 mb-6" variant={"purple"}>
//           Submit
//         </Button>
//       </div>
//     </PurpleGradient>
//   );
// }