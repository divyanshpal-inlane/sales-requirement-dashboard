// heltar-service.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Template definitions with their IDs and content
export const TEMPLATES = {
  PASSWORD_RESET_OTP: {
    name: "webapp_forgot_pass_otp",
    id: "1882962382451209",
    language: "en",
    content:
      "Hey {{1}},\n\nWe received a request to reset your password for the *Lane App* 😊  \nYour one-time password (OTP) is: {{2}}  \n\nPlease use it to create a new password 🔢  \n\nIf you didn't request this password reset, please contact us  \n\nThank you, \nLane Team 🚗",
  },
  PAYMENT_LINK: {
    name: "webapp_payment_for_course",
    id: "672562828631823",
    language: "en",
    content:
      "Hey {{1}},  \n\nGreat choice with the {{2}}! You're one step away from starting your driving journey 🚗.  \n\n*Amount Due:* {{3}} \n*Duration:* {{4}} hours  \n\nTo complete the registration, you can pay here: {{5}}  \n\nThank you so much 🤩. We're in this together - everyone starts from the beginning, and soon you'll be driving with the breeze in your hair! 🌬️   \n\nIf you need any help, please ping us. We can't wait to see you behind the wheel!  \n\nLet's go, \nLane 😊🚘",
  },
  THANK_YOU_PAYMENT_DL: {
    name: "webapp_thank_you_payment_book_classes",
    id: "1326402785451338",
    language: "en",
    content:
      "Hi {{1}},  Woohoo! 🎉 Thanks for completing your payment of {{2}}. We're so pumped to be your driving buddies 🛞🚘  *Here's what's next:*  *Please sign up and share your availability:*  Fill out the details to help us create your lesson schedule  *Learn about road rules and car controls:* Dive into our fun, interactive game to boost your driving skills  Once you have shared your details, do check out our gaming section while we prepare your lesson plan. Thank you 😊  We can't wait to see you behind the wheel!  Catch you soon, Lane 🚗",
  },
  THANK_YOU_PAYMENT_LL_FIRST: {
    name: "webapp_thank_you_payment_ll_first",
    id: "1999611653847364",
    language: "en",
    content:
      "Hey {{1}},  Woohoo! 🎉 Thanks for completing your payment of {{2}}. We're so pumped to be your driving buddies 🛞🚘  *Here's what's next:*  *Please sign up and share your details:* It will help us start with your application process  *Learn about road rules and car controls:* Dive into our fun game to help you ace your learner's test  Once you've filled in the details, do book an appointment and our team will reach out to guide you through the next steps. We can't wait to get started!  Thank you for choosing Lane! 😊",
  },
  SIGN_UP_ON_APP: {
    name: "webapp_sign_up_on_the_app",
    id: "1380407379792408",
    language: "en",
    content:
      "Hey {{1}},  We hope you are having the best day! 🤗👋 We wanted to check in on our future driving superstar! ⭐  We are super close to starting your on road practice lessons 🚘🚘  Please do check out our web app and take the next steps, if you haven't already 📝✅  In case you need any help, we are one ping away ❤️  Best, Lane",
  },
  LL_DETAILS_BOOK_APPOINTMENT: {
    name: "webapp_thanks_for_ll_details_book_appointment",
    id: "2940716509421327",
    language: "en",
    content:
      "Hey {{1}},  We hope you are having a good day! 🤩🌟 Thank you for filling the details for the learners license application 😍  Please do book an appointment with our team and let's submit your application soon ✅  Thank you so much, Lane Team 🥳",
  },
  LL_DONE_APP_NUMBER: {
    name: "webapp_ll_done_app_number",
    id: "629013709660812",
    language: "en",
    content:
      "Hey {{1}},  Congratulations on your learners license application! 🥳🎉 Your application number is {{2}}  You can easily check the status of your application using this number on the Government Portal.  Please do check the *Lane App* for the next steps. Wishing you all the very best ❤️😊  Your driving buddy,  Lane 🚗🚘",
  },
  UPDATE_ON_LL_APP: {
    name: "webapp_update_on_ll_app",
    id: "425990800598597",
    language: "en",
    content:
      "Hey {{1}},  We hope you are having a good day! 😊  There is an update on your learners license application. Please do check the *Lane App* for the same 😇✅  Thank you so much,  Lane ⭐️⭐️",
  },
  LL_YAYY_AVAILABILITY: {
    name: "webapp_ll_yayy_availability",
    id: "9288425437883233",
    language: "en",
    content:
      "Hey {{1}},  We hope you are having the best day! 😊  Congratulations on your Learners License 🥳🥳 Please check the *Lane App* for further steps and do share your availability with us 📆 Let's book your on road practice lessons ✅  All the very best. We are very excited for this 😇😇 Lane Team 🚗🚗",
  },
  CHECK_YOUR_SCHEDULE: {
    name: "webapp_check_your_schedule",
    id: "1137463954486104",
    language: "en",
    content:
      "Hi {{1}},  We hope you are having a good day! Thank you for your patience. Your schedule has been created, please do check it on the *Lane App* ❤️🥳  Your lessons start on {{2}} from {{3}}. This is super exciting, we can't wait for your first lesson 😍  *Reminder:* - Arrive 5 minutes early  - Have your license on DigiLocker/physically  - Wear comfy clothes and shoes  Thank you so much. Get ready to rock your lessons ⭐️  Best,  Lane 🏎️",
  },
  SIGN_UP_DONE_SCHEDULE_PLEASE: {
    name: "webapp_sign_up_done_schedule_please",
    id: "1157514989288742",
    language: "en",
    content:
      "Hey {{1}}  We hope you are having the best day! ✌️ Please select your preferred schedule for the on road practice lessons on the *Lane App*   Thank you so much 🥳😊  Regards,  Lane Team 🚗🚗",
  },
  THANKS_FOR_AVAILABILITY: {
    name: "webapp_thanks_for_availability_team_is_preparing_schedule",
    id: "2136932170098852",
    language: "en",
    content:
      "Hey {{1}},  Thank you for sharing your availability for the on road practice lessons, our team is brewing the best lesson plan and we will get back to you super soon ⏰⌛  In the meantime, please do go through a few cool learning modules we have prepared for you 🕹️🎮  Happy Gaming,  Lane Team 👾🃏",
  },
  REMINDER_CUSTOMER_FOR_CLASS: {
    name: "webapp_reminder_customer_for_class_tomorrow",
    id: "587649420697566",
    language: "en",
    content:
      "Hey {{1}},\n\nWe hope you are having the best day. Your have a lesson tomorrow 📔🚗. Do check the details below:\n\n*Date:* {{2}}\n*Time:* {{3}}\n*Driving Buddy:* {{4}}\n*Contact Details:* {{5}}\n\nCheck the *Lane App* for more details 🥳\n\nThank you,\nLane Team 🚗🚗",
  },
  INSTRUCTOR_DAILY_SCHEDULE: {
    name: "instructor_daily_schedule",
    language: "en",
    content:
      "Hey {{1}},\nWe hope your day went well and you had the best time! Here is your schedule for tomorrow:\n \n{{2}}\n{{3}}\n{{4}}\n{{5}}\n{{6}}\n{{7}}\nPlease check your calendar for more details 😊\nThank you!\nThe Lane Team 🚗",
  },
  WEBAPP_RESCHEDULE_REQUEST: {
    name: "webapp_reschedule_request",
    id: "1314909306448228",
    language: "en",
    content:
      "Hey {{1}},\n\nWe hope you are doing well! We received a rescheduling request from your end. Our team will process it and get back to you soon.\n\nThank you 😊\n\nBest,\nLane Team 🚗",
  },
  WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE: {
    name: "webapp_reschedule_done_check_new_schedule",
    id: "553174450476478",
    language: "en",
    content:
      "Hey {{1}},\n\nGreetings for the day! We have changed your schedule as per your requirement and slot availability. Do check it on the *Lane App* 😊🥳\n\nThank you so much,\nLane team 🚗",
  },
  WEBAPP_SCHEDULE_LESSON_10: {
    name: "webapp_schedule_lesson_10",
    id: "1310229270234261",
    language: "en",
    content:
      "Hey {{1}},\n\nGreetings for the lovely day! You are super close to your DL test 🥳\n\nLet's book your last lesson where we will prep for the RTO test. You will ace it with a flair, we are confident of that 😊😊\n\nPlease select a few slots you are available on before your DL test date on the *Lane App*\n\nThank you,\nLane Team 😇",
  },
  WEBAPP_LESSON_10_SCHEDULED: {
    name: "webapp_lesson_10_scheduled",
    id: "1777966153051875",
    language: "en",
    content:
      "Hey {{1}},\n\nHow excited are you for your DL test? 😃😃\n\nWe have scheduled your last lesson, please do refer to the *Lane App* for the same 🛣🅿️\n\nThank you so much,\nLane Team 🚗🚗",
  },
  WEBAPP_ALL_THE_BEST_FOR_DL_TEST: {
    name: "webapp_all_the_best_for_dl_test",
    id: "682178207571872",
    language: "en",
    content:
      "Hey {{1}},\n\nWe hope you are doing well! We are very excited that you have your DL test tomorrow, all the very best for it 🥳😇 We are here you support you throughout the journey\n\nHere are the details:\n*Test Date:* {{2}}\n*RTO:* {{3}}\n*Lane Team Member:* {{4}}\n*Contact details:* {{5}}\n\nRequired *Original Documents* you should carry:\n- Aadhaar Card\n- PAN Card\n- Rental Agreement (if applicable)\n\nPlease watch the video to understand the process. Carry all necessary documents and let's ace the test. If you have any questions, feel free to reach out. Wishing you best of luck!\n\nYour Buddy,\nLane 🚗",
  },
  WEBAPP_DL_TEST_NOT_PASSED_IT_IS_ALRIGHT: {
    name: "webapp_dl_test_not_passed_it_is_alright",
    id: "1744731289408037",
    language: "en",
    content:
      "Hey {{1}},\n\nGreetings for the day! Don't worry that it didn't work out this time, we are here to support you and next time we will ace it for sure ❤️🚗\n\nOur team will get in touch with you for the next steps on applying for the DL retest.\n\nThank you and have a good day,\nLane Team ⭐️",
  },
  WEBAPP_CONGRATULATIONS_ON_PASSING_THE_DL_TEST: {
    name: "webapp_congratulations_on_passing_the_dl_test",
    id: "965902492340541",
    language: "en",
    content:
      "Hey {{1}},\n\nWe are really happy and excited that you passed the DL test. Many many congratulations on that 🥳🥳🥳\n\nOnce the DL is issued by the RTO, they will drop a message to your official number. Thank you so much for choosing us in this journey.\n\nWe are sharing a few socials where you can put in a review and tag us, if you wish to ❤️❤️\n\nIt will be super helpful for us 😊😊 Have the best time behind the wheel and share your driving stories with us 😍😍\n\nThank you so much 😊😊\nLane Team 🚗🚗\n*(By Your Side, Every Ride)*",
  },
  WEBAPP_LESSONS_DONE_REVIEW_PLEASE: {
    name: "webapp_lessons_done_review_please",
    id: "1197299391824598",
    language: "en",
    content:
      "Hey {{1}},\n\nWe are really happy and excited that you completed all your lessons. Many many congratulations on that 🥳🥳🥳 Thank you so much for choosing us in this journey\n\nWe are sharing a few socials where you can put in a review and tag us, if you wish to ❤️❤️\n\nIt will be super helpful for us 😊😊 Have the best time behind the wheel and share your driving stories with us 😍😍\n\nThank you so much 😊😊\nLane Team 🚗🚗\n*(By Your Side, Every Ride)*",
  },
  webapp_thank_you_for_signing_up_ll_first: {
    name: "webapp_thank_you_for_signing_up_ll_first",
    id: "1848840602545784",
    language: "en",
    content:
      "Hey {{1}},\n\nThank you for signing up on the *Lane App* 🎉 Let's get started with the next steps that will bring you closer to your on road practice lessons 🛞🚘\n\n*Here's what's next:*\n\n*Please fill the learners license details form and book an appointment with us:* It will help us start with your application process\n\n*Learn about road rules and car controls:* Dive into our fun game to help you ace your learner's test\n\nOnce you've filled in the details, do book an appointment and our team will reach out to guide you through the next steps. We can't wait to get started!\n\nThank you for choosing Lane! 😊",
  },
  webapp_thank_you_signup_availabilty_for_lessons: {
    name: "webapp_thank_you_signup_availabilty_for_lessons",
    id: "993656192751946",
    language: "en",
    content:
      "Hey {{1}} 😊\n\nThank you for signing up with Lane 🥳🥳  Let's get started with the next steps, bringing you closer to your on road practice lessons 🛞🚗  *Here's what's next:*  *Please do share your availability for the on road practice lessons:* It will help us prepare the best lesson plan for you 📆📆  *Dive deep into the gaming modules:* It will help you gain confidence on the road rules 🌟🌟  Thank you for trusting us with this. Do check the learning module while we prepare your lesson plan 😇  Catch up soon,  Lane Team 🚗",
  },
  webapp_restest_ll: {
    name: "webapp_restest_ll",
    id: "2116429285449145",
    language: "en",
    content:
      "Hey {{1}},\n\nGreetings for the day! We saw there was an update on the application. The test is just one hurdle, which we will pass together. Let's give it again and ace it 😊🥳\n\nAll the very best ❤️ Contact us for any help, we are by your side in this 😊😊\n\nDo update us on the Lane App with the results\n\nYour buddy,\nLane 🚗",
  },
  webapp_ll_docs_approved_test_done_and_result: {
    name: "webapp_ll_docs_approved_test_done_and_result",
    id: "1412944839868631",
    language: "en",
    content:
      "Hey {{1}} 😊\n\nCongratulations on getting your documents approved by the Government 🥳🥳\n\nPlease do give your LL test and let us know how it went 😊 All the very best for it 👍\n\nIf you have already appeared for the test, do let us know the results on the *Lane App* ⭐️\n\nThank you,\nLane Team 🚗🚗",
  },
  webapp_please_fill_ll_form_and_book_appointment: {
    name: "webapp_please_fill_ll_form_and_book_appointment",
    id: "1195268635499254",
    language: "en",
    content:
      "Hey {{1}} 😊\n\nWe hope you are having the best day! 🥳\n\nWe noticed you are yet to provide us with the details for the learners license application form and book the appointment for your application 🤔\n\nPlease do share your availability to enable us to apply with the government. Thank you ✅\n\nWe are closer to our practice lessons,\nLane Team 🚗",
  },
  webapp_thank_you_for_payment_generic: {
    name: "webapp_thank_you_for_payment_generic",
    id: "598829129823819",
    language: "en",
    content:
      "Hey {{1}} 😊\n\nGreetings for the lovely day! Wohoooo 🥳🥳 Thank you so much for making the payment of {{2}}. We are so pumped up to be your driving buddy 🚗🚗\n\nPlease do sign up on the *Lane App* and have a fun time exploring our cool modules and get started with your learning process ☺️☺️\n\nWe are super excited for this. Ping us for any support, if needed ⭐️\n\nYour driving buddy,\nLane 🚘🛣",
  },
};

// Helper functions
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  let period = "AM";
  let hourNum = parseInt(hours);

  if (hourNum >= 12) {
    period = "PM";
    if (hourNum > 12) {
      hourNum -= 12;
    }
  }

  if (hourNum === 0) {
    hourNum = 12;
  }

  return `${hourNum}:${minutes} ${period}`;
};

const formatDate = (date: string): string => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

class HeltarMessageService {
  private supabaseClient;

  constructor() {
    this.supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
  }

  // Core messaging function
  async sendTemplate(
    phone: string,
    templateKey: keyof typeof TEMPLATES,
    variables: any[],
    refId?: string,
  ) {
    const template = TEMPLATES[templateKey];

    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    const messagePayload = {
      messages: [
        {
          clientWaNumber: phone,
          templateName: template.name,
          templateContent: template.content,
          templateHeader: "",
          languageCode: template.language,
          variables: [
            {
              type: "body",
              parameters: variables.map((text) => ({
                type: "text",
                text: text || " ",
              })),
            },
          ],
          messageType: "template",
          refId: refId || `${template.name}-${Date.now()}`,
        },
      ],
    };

    try {
      // Send WhatsApp message
      const response = await fetch("https://api.heltar.com/v1/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("HELTAR_API_KEY")}`,
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      return { success: true, messagePayload };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // Function to get learner details by ID
  async getLearnerDetails(learnerId: string) {
    const { data: learner, error } = await this.supabaseClient
      .from("Learner")
      .select("*")
      .eq("id", learnerId)
      .single();

    if (error) throw error;
    return learner;
  }

  async processMessageRequest(messageType: string, data: any) {
    try {
      switch (messageType) {
        case "PAYMENT_LINK": {
          const {
            learner_id,
            course_name,
            payment_amount,
            duration,
            payment_link,
          } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,

            "PAYMENT_LINK",
            [
              learner.name,
              course_name,
              `Rs. ${payment_amount}`,
              `${duration} hours`,
              payment_link,
            ],
            `payment-link-${learner_id}-${Date.now()}`,
          );
        }

        case "THANK_YOU_PAYMENT": {
          const { learner_id, has_dl, payment_amount } = data;
          const learner = await this.getLearnerDetails(learner_id);

          if (has_dl) {
            return this.sendTemplate(
              learner.phone,
              "THANK_YOU_PAYMENT_DL",
              [learner.name, `Rs. ${payment_amount}`],
              `thank-you-dl-${learner_id}-${Date.now()}`,
            );
          } else {
            return this.sendTemplate(
              learner.phone,
              "THANK_YOU_PAYMENT_LL_FIRST",
              [learner.name, `Rs. ${payment_amount}`],
              `thank-you-ll-${learner_id}-${Date.now()}`,
            );
          }
        }

        case "SIGN_UP_REMINDER": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "SIGN_UP_ON_APP",
            [learner.name],
            `signup-reminder-${learner_id}-${Date.now()}`,
          );
        }

        case "LL_DETAILS_BOOK_APPOINTMENT": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "LL_DETAILS_BOOK_APPOINTMENT",
            [learner.name],
            `ll-book-appt-${learner_id}-${Date.now()}`,
          );
        }

        case "LL_APPLICATION_SUBMITTED": {
          const { learner_id, application_number } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "LL_DONE_APP_NUMBER",
            [learner.name, learner.LL_application_id],
            `ll-app-submitted-${learner_id}-${Date.now()}`,
          );
        }
        case "PASSWORD_RESET_OTP": {
          const { learner_id, otp } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "PASSWORD_RESET_OTP",
            [learner.name, otp],
            `password-reset-otp-${learner_id}-${Date.now()}`,
          );
        }

        case "LL_APPLICATION_UPDATE": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "UPDATE_ON_LL_APP",
            [learner.name],
            `ll-app-update-${learner_id}-${Date.now()}`,
          );
        }

        case "LL_RECEIVED": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "LL_YAYY_AVAILABILITY",
            [learner.name],
            `ll-received-${learner_id}-${Date.now()}`,
          );
        }

        case "SCHEDULE_PREPARED": {
          const { learner_id, start_date, start_time } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "CHECK_YOUR_SCHEDULE",
            [learner.name, start_date, start_time],
            `schedule-prepared-${learner_id}-${Date.now()}`,
          );
        }

        case "SIGN_UP_DONE_NEED_SCHEDULE": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "SIGN_UP_DONE_SCHEDULE_PLEASE",
            [learner.name],
            `signup-done-need-schedule-${learner_id}-${Date.now()}`,
          );
        }

        case "THANKS_FOR_AVAILABILITY": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "THANKS_FOR_AVAILABILITY",
            [learner.name],
            `thanks-availability-${learner_id}-${Date.now()}`,
          );
        }

        case "CLASS_REMINDER": {
          const { learner_id, schedule_id } = data;
          const learner = await this.getLearnerDetails(learner_id);

          // Get schedule details
          const { data: schedule, error: scheduleError } =
            await this.supabaseClient
              .from("Schedule")
              .select(
                `
              *,
              Instructor (
                id_instructor,
                name,
                phone
              )
            `,
              )
              .eq("id", schedule_id)
              .single();

          if (scheduleError) throw scheduleError;

          const dateString = formatDate(schedule.date);
          const timeString = formatTime(schedule.start_time);

          return this.sendTemplate(
            learner.phone,
            "REMINDER_CUSTOMER_FOR_CLASS",
            [
              learner.name,
              dateString,
              timeString,
              schedule.Instructor.name,
              schedule.Instructor.phone,
            ],
            `class-reminder-${learner_id}-${schedule_id}-${Date.now()}`,
          );
        }

        case "DAILY_SCHEDULE": {
          const { learner_id, reschedule_lesson_number = 1 } = data;

          // Fetch all schedules with related data
          const { data: schedules, error: schedulesError } =
            await this.supabaseClient
              .from("Schedule")
              .select(
                `
              *,
              Instructor (
                id_instructor,
                name,
                phone
              ),
              Lesson (
                id,
                number
              )
            `,
              )
              .eq("learner_id", learner_id)
              .order("date")
              .order("start_time");

          if (schedulesError) {
            throw schedulesError;
          }

          const learner = await this.getLearnerDetails(learner_id);

          // Filter schedules based on reschedule_lesson_number
          const filteredSchedules = schedules.filter(
            (schedule) => schedule.Lesson.number >= reschedule_lesson_number,
          );

          // Format schedule messages
          const scheduleMessages = filteredSchedules.map((schedule, index) => {
            const date = formatDate(schedule.date);
            const startTime = formatTime(schedule.start_time);
            const endTime = formatTime(schedule.end_time);
            return `${
              index + 1
            }.${date}. ${startTime} - ${endTime}: Lesson ${schedule.Lesson.number} with ${schedule.Instructor.name}`;
          });

          // Fill remaining slots with empty strings if less than 6 schedules
          while (scheduleMessages.length < 6) {
            scheduleMessages.push("");
          }

          return this.sendTemplate(
            learner.phone,
            "INSTRUCTOR_DAILY_SCHEDULE",
            [learner.name, ...scheduleMessages.slice(0, 6)],
            `schedule-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_RESCHEDULE_REQUEST": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_RESCHEDULE_REQUEST",
            [learner.name],
            `reschedule-request-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
            [learner.name],
            `reschedule-done-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_SCHEDULE_LESSON_10": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_SCHEDULE_LESSON_10",
            [learner.name],
            `schedule-lesson-10-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_ALL_THE_BEST_FOR_DL_TEST": {
          const {
            learner_id,
            test_date,
            rto,
            lane_team_member,
            contact_details,
          } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_ALL_THE_BEST_FOR_DL_TEST",
            [learner.name, test_date, rto, lane_team_member, contact_details],
            `all-the-best-dl-test-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_DL_TEST_NOT_PASSED_IT_IS_ALRIGHT": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_DL_TEST_NOT_PASSED_IT_IS_ALRIGHT",
            [learner.name],
            `dl-test-not-passed-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_CONGRATULATIONS_ON_PASSING_THE_DL_TEST": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_CONGRATULATIONS_ON_PASSING_THE_DL_TEST",
            [learner.name],
            `congrats-dl-test-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_LESSONS_DONE_REVIEW_PLEASE": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_LESSONS_DONE_REVIEW_PLEASE",
            [learner.name],
            `lessons-done-review-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_THANK_YOU_FOR_SIGNING_UP_LL_FIRST": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "webapp_thank_you_for_signing_up_ll_first",
            [learner.name],
            `thank-you-ll-first-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_THANK_YOU_SIGNUP_AVAILABILTY_FOR_LESSONS": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_THANK_YOU_SIGNUP_AVAILABILTY_FOR_LESSONS",
            [learner.name],
            `thank-you-signup-availability-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_RESTEST_LL": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "webapp_restest_ll",
            [learner.name],
            `restest-ll-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_LL_DOCS_APPROVED_TEST_DONE_AND_RESULT": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "webapp_ll_docs_approved_test_done_and_result",
            [learner.name],
            `ll-docs-approved-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_PLEASE_FILL_LL_FORM_AND_BOOK_APPOINTMENT": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "webapp_please_fill_ll_form_and_book_appointment",
            [learner.name],
            `ll-fill-form-${learner_id}-${Date.now()}`,
          );
        }
        case "WEBAPP_THANK_YOU_FOR_PAYMENT_GENERIC": {
          const { learner_id, payment_amount } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "webapp_thank_you_for_payment_generic",
            [learner.name, `Rs. ${payment_amount}`],
            `thank-you-payment-${learner_id}-${Date.now()}`,
          );
        }

        case "WEBAPP_LESSON_10_SCHEDULED": {
          const { learner_id } = data;
          const learner = await this.getLearnerDetails(learner_id);
          return this.sendTemplate(
            learner.phone,
            "WEBAPP_LESSON_10_SCHEDULED",
            [learner.name],
            `lesson-10-scheduled-${learner_id}-${Date.now()}`,
          );
        }

        default:
          throw new Error(`Unknown message type: ${messageType}`);
      }
    } catch (error) {
      console.error("Error processing message request:", error);
      throw error;
    }
  }
}

// Create and export service instance
export const heltarMessageService = new HeltarMessageService();
