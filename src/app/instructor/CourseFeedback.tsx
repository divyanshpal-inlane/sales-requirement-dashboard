import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";


const MAX_CHAR_LIMIT = 1024; 

const PRIMARY_COLOR = '#6257FF'; // Using Car Condition blue for primary elements
const SECONDARY_COLOR = '#B28FFF'; // Using More Guidance purple for secondary elements
const TERTIARY_COLOR = '#FFC229'; // Using Lesson Duration yellow for main rating

const StarRating = ({ value, setValue, maxStars = 5 }) => {
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

const useEnrollmentIdQuery = (learnerId, courseId, enabled) => {
  return useQuery({
    queryKey: ['enrollmentId', learnerId, courseId],
    queryFn: async () => {
      if (!learnerId || !courseId) {
        throw new Error("Missing learnerId or courseId.");
      }
      
      const { data, error } = await supabase
        .from('enrollment')
        .select('id, Learner!inner(name), Courses!inner(name)')
        .eq('learner_id', learnerId)
        .eq('course_id', courseId)
        .single();

      if (error) {
        throw new Error('Could not find enrollment record.');
      }

      if (!data || !data.id) {
          throw new Error('Enrollment record found but ID is missing.');
      }
    //   console.log("Fetched enrollment data:", data);
      return data;
    },
    // Only fetch if the dialog is open and IDs are provided
    enabled: enabled && !!learnerId && !!courseId, 
    staleTime: 0 * 60 * 1000, // 5 minutes
    retry: 5, // Retry fetching only once
  });
};


export default function CourseFeedbackPage({
  learnerId,
  courseId, 
  open,
  onOpenChange,
}) {
  // --- STATE DEFINITIONS (Must be run unconditionally) ---
  const [rating, setRating] = useState(0); 
  const [hover, setHover] = useState(null);
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
  
  // Form Validation State
  const [formIsValid, setFormIsValid] = useState(false); 

  // Fetch the enrollment ID
  const { data: enrollmentData, isLoading: isEnrollmentLoading, isError: isEnrollmentError, error: enrollmentError } = useEnrollmentIdQuery(learnerId, courseId, open);

  const { toast } = useToast();
console.log("Enrollment data", enrollmentData);
  // Local Mutation Hook Definition (uses the fetched enrollmentId)
  const useSaveFeedbackMutation = (enrollmentData) => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: async ({ feedbackJson }) => {
        // Validation check for ID before mutation
        if (!enrollmentData?.id) {
            throw new Error("Enrollment ID not available for mutation.");
        }
        
        const { data, error } = await supabase
          .from('enrollment') 
          .update({ course_feedback: feedbackJson }) 
          .eq('id', enrollmentData?.id) // Use the fetched ID
          .select(); 

        if (error) {
          throw new Error('Failed to save feedback to the database.');
        }
        return data;
      },
      
      onSuccess: (data, variables) => {
        // Invalidate the query using the fetched enrollmentId
        queryClient.invalidateQueries({
          queryKey: ['enrollmentUpdateFeedback', enrollmentData?.id] 
        });
        toast({
            title: "Success",
            description: 'Feedback sent successfully.',
            variant: "success",
        });
      },
      
      onError: (error) => {
        toast({
            title: "Failure",
            description: 'Feedback failed.',
            variant: "destructive", 
        });
      },
    });
  };

  // 3. Get the mutation context
  const feedbackMutation = useSaveFeedbackMutation(enrollmentData);
  
  // --- HELPER DATA AND LOGIC ---
  const carTypeOptions = ['Hatchback', 'Sedan', 'SUV'];
  const conditionOptions = ['New', 'Used'];
  const timeframeOptions = ['0-3 Months', '3-6 Months', '6-12 Months', '1+ Year', 'Not Sure'];

  // Checks if the main rating and all performance ratings are selected (i.e., not 0)
  const validateForm = () => {
      const isRatingValid = rating > 0 && clutchBrakeRating > 0 && distanceMatchRating > 0 && parkingRating > 0;
      setFormIsValid(isRatingValid);
      return isRatingValid;
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
  
  const handleFeedbackChange = (e) => {
    const newText = e.target.value;
    
    if (newText.length > MAX_CHAR_LIMIT) {
      alert(`Character limit of ${MAX_CHAR_LIMIT} exceeded!`);
      setFeedbackText(newText.substring(0, MAX_CHAR_LIMIT));
    } else {
      setFeedbackText(newText);
    }
  };

const handleSaveFeedback = async () => {
    // Check form validity AND enrollment ID existence
    if (!formIsValid || !enrollmentData) {
        return;
    }
    
    // Prepare Feedback Data
    const finalFeedback: any = { 
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
      textFeedback: feedbackText,
      // Ensure courseName and timestamp are included for Edge Function validation
      timestamp: new Date().getTime(), 
      courseName: enrollmentData?.Courses?.name || "N/A", 
    };
    
    // Prepare Payload for Edge Function
    const edgeFunctionPayload = {
        customerName: enrollmentData?.Learner?.name || "N/A",
        feedbackData: finalFeedback,
    };

    console.log("Updating final feedback with", finalFeedback, enrollmentData?.Learner?.name );
    try {
        // Backend Update
        await feedbackMutation.mutateAsync({ 
          feedbackJson: finalFeedback 
        });

        toast({
            title: "Feedback Saved Successfully",
            description: "Feedback has been recorded.",
            variant: "success",
        });

        // Edge Function Call
        console.log("Database updated successfully. Invoking Edge Function to send report...");
        
        // Use the Supabase client to invoke the Edge Function
        // The client automatically handles passing the Authorization header (JWT)
        const { data, error } = await supabase.functions.invoke("send-course-feedback-email", {
            method: 'POST',
            body: edgeFunctionPayload,
        });

        if (error || (data && data.success === false)) {
            // Check for both invocation error and Edge Function internal failure response
            console.error("Notification invocation failed (email not sent). Details:", error || data.details);

            // Failure Toast for Email Report
            toast({
                title: "Email Generation Warning",
                description: "The course feedback could not be sent. Data saved successfully.",
                variant: "warning", // Use 'warning' or a distinct style
            });
        } else {
            // Success Toast for Email feedback
            console.log("Edge Function succeeded. Report sent.", data);
            toast({
                title: "Feedback Sent",
                description: "The course feedback report has been successfully sent.",
                variant: "success",
            });
        }
        
        // Close the dialog shortly after successful actions
        setTimeout(() => {
            onOpenChange(false); 
        }, 500);

    } catch (error) {
        // This catch block handles errors from feedbackMutation.mutateAsync or supabase.functions.invoke
        console.error("Action failed (Mutation or Function Invocation):", error);
        // Error handling is managed by the hook and toast.
    }
};


  // --- 4. CONDITIONAL RENDER (Loading/Error) ---

  const renderContent = () => {
    if (isEnrollmentLoading) {
        return (
            <div className="p-10 text-center text-lg text-indigo-600">
                Loading enrollment data...
            </div>
        );
    }
    
    if (isEnrollmentError || !enrollmentData) {
        return (
            <div className="p-10 text-center text-red-600">
                Error: Could not retrieve enrollment ID. Feedback cannot be submitted.
                <p className="text-sm mt-2 text-gray-500">{enrollmentError?.message || 'Check Learner ID and Course ID.'}</p>
            </div>
        );
    }
    
    // If enrollmentId is successfully loaded, render the form
    return (
        <>
            {/* Scrollable Container inside Dialog */}
            <div className="flex flex-col p-6 overflow-y-auto max-h-[90vh]"> 
                
                {/* The main content structure starts here */}
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
                                        (hover || rating) >= star ? 'text-yellow-500' : "text-gray-400"
                                    }`}
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
                    
                    {/* Feedback Card (Open Text) */}
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
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-center p-6 pt-0">
                <Button 
                    onClick={handleSaveFeedback} 
                    disabled={!formIsValid || feedbackMutation.isPending || isEnrollmentLoading || isEnrollmentError || !enrollmentData}
                    className={`w-full ${(!formIsValid || feedbackMutation.isPending || isEnrollmentLoading || isEnrollmentError || !enrollmentData) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    variant={"purple"}
                >
                    {feedbackMutation.isPending ? 'Saving...' : (formIsValid ? 'Submit' : 'Submit (Complete Ratings)')}
                </Button>
            </div>
            {!formIsValid && <p className="text-center text-sm text-red-500 -mt-4">Please complete all required ratings (*).</p>}
        </>
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        
        <DialogHeader>
          <DialogTitle>Course Feedback</DialogTitle> 
          <DialogDescription>Please provide your feedback on the course and your driving performance metrics.</DialogDescription>
        </DialogHeader>

        {renderContent()}
        
      </DialogContent>
    </Dialog>
  );
}








  // onOpenChange(false);
  // return <></>
//   const [rating, setRating] = useState<number | null>(4);
//   const [hover, setHover] = useState<number | null>(null);
//   const [selectedButton, setSelectedButton] = useState<number | null>(null);

//   const colors = [
//     { id: 1, color: "#00CE84" },
//     { id: 2, color: "#B28FFF" },
//     { id: 3, color: "#6257FF" },
//     { id: 4, color: "#00FF91" },
//     { id: 5, color: "#FFC229" },
//     { id: 6, color: "#6BECFF" },
//   ];

//   const handleRatingMessage = () => {
//     if (rating !== null) {
//       if (rating < 3) return "Not Good";
//       if (rating === 3) return "Decent";
//       if (rating > 3) return "Excellent";
//     }
//     return "";
//   };

//   if (!enrollmentId) {
//     return (<div> Data not available</div>);
//   }

//   const handleSaveFeedback = async () => {

//   }

// return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <div className="flex flex-col p-6">
//           <div className="relative mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
//             {/* Stars card */}
//             <div className="flex flex-col items-center justify-center rounded-lg p-6">
//               <h1 className="mb-4 text-2xl font-bold">Rate Us</h1>
//               <div className="mb-4 flex space-x-2">
//                 {[1, 2, 3, 4, 5].map((star) => (
//                   <button
//                     key={star}
//                     type="button"
//                     onClick={() => setRating(star)}
//                     onMouseEnter={() => setHover(star)}
//                     onMouseLeave={() => setHover(null)}
//                     className={`text-3xl ${
//                       (hover || rating) >= star
//                         ? "text-yellow-500"
//                         : "text-gray-400"
//                     }`}
//                   >
//                     ★
//                   </button>
//                 ))}
//               </div>
//               <div className="text-lg font-semibold">
//                 {rating !== null ? handleRatingMessage() : "Select a rating"}
//               </div>
//               {rating && (
//                 <div className="mt-4 text-sm text-gray-600">
//                   You rated us {rating} out of 5 stars!
//                 </div>
//               )}
//             </div>
//             {/* What could be improved? */}
//             <div className="mt-10">
//               <h2 className="text-center font-semibold">
//                 What could be improved?
//               </h2>
//             </div>
//             {/* Feedback Card */}
//             <div className="mt-6 rounded-lg bg-white p-6">
//               <div className="mb-4 flex flex-row items-center justify-center gap-1.5 text-2xl font-bold">
//                 <MessageSquarePlus size={21} />
//                 <p>Feedback</p>
//               </div>
//               <textarea
//                 className="h-32 w-full rounded-lg border border-gray-300 p-4"
//                 placeholder="Enter your feedback here..."
//               />
//             </div>
//           </div>

//           <Button className="w-full" variant={"purple"} onClick={handleSaveFeedback}>
//             Submit
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
