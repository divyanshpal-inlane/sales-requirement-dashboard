import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

// The 10-lesson Beginner course. The demo lesson doubles as this course's
// first lesson, so demo-credit lesson skipping applies ONLY to this course.
const BEGINNER_COURSE_ID = "e129f667-0510-4f07-9847-edb58356dc74";

function getHalfPaymentLessons(totalHours: number): number[] {
  if (totalHours <= 1) return [1];
  if (totalHours === 2) return [1];
  const count = totalHours - 2;
  return Array.from({ length: count }, (_, i) => i + 1);
}

export interface CompletePaymentResult {
  alreadyCompleted: boolean;
  paymentId: string;
  paymentType: string;
  learnerId: string;
}

/**
 * Marks a payment as completed and runs all downstream updates
 * (enrollment, schedules, reschedule_requests, thank-you message).
 *
 * Idempotent: if the payment is already "completed", returns early
 * without modifying any state. Safe to call from multiple paths
 * (frontend verify, webhook, admin recovery).
 *
 * Shared by verify-razorpay-payment, razorpay-webhook, and
 * recover-razorpay-payment.
 */
export async function completePayment(
  supabaseClient: SupabaseClient,
  paymentId: string,
  gatewayReference: string,
): Promise<CompletePaymentResult> {
  const { data: payment, error: paymentError } = await supabaseClient
    .from("payment")
    .select(
      `
      id,
      learner_id,
      payment_type,
      amount,
      installment_type,
      status,
      Learner (
        phone
      )
    `,
    )
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  if (payment.status === "completed") {
    return {
      alreadyCompleted: true,
      paymentId,
      paymentType: payment.payment_type || "course",
      learnerId: payment.learner_id,
    };
  }

  const { error: updateError } = await supabaseClient
    .from("payment")
    .update({ status: "completed", gateway_reference: gatewayReference })
    .eq("id", paymentId);

  if (updateError) throw updateError;

  const installmentType = payment.installment_type || "full";
  const paymentType = payment.payment_type || "course";

  if (paymentType === "course") {
    const { data: enrollment, error: enrollmentQueryError } =
      await supabaseClient
        .from("enrollment")
        .select("*, unlocked_lessons")
        .eq("payment_id", paymentId)
        .single();
    if (enrollmentQueryError) throw enrollmentQueryError;
    if (!enrollment) throw new Error("Enrollment record not found");

    let newPaymentStatus = enrollment.payment_status;
    let unlockedLessons = enrollment.unlocked_lessons || [];

    // Course length comes from the actual course row — it was previously
    // hardcoded to 10, which unlocked phantom lessons for the short specialty
    // courses (e.g. 2-hour Flyover/Parking).
    let totalCourseLessons = enrollment.progress?.total_hours || 10;
    if (enrollment.course_id) {
      const { data: courseRow } = await supabaseClient
        .from("Courses")
        .select("total_lessons, duration")
        .eq("id", enrollment.course_id)
        .maybeSingle();
      totalCourseLessons =
        courseRow?.total_lessons ||
        courseRow?.duration ||
        totalCourseLessons;
    }

    // Demo-as-lesson-1 skipping applies ONLY to the Beginner course, where
    // the demo doubles as lesson 1. Include "upgraded" demos: the demo
    // payment is flipped completed -> upgraded when the learner upgrades to
    // a course, so counting only "completed" loses the demo credit and
    // unlocks one lesson too many (must stay in sync with the same count in
    // CreateSchedule).
    let demoSkip = 0;
    if (enrollment.course_id === BEGINNER_COURSE_ID) {
      const { data: completedDemoPayments } = await supabaseClient
        .from("payment")
        .select("id")
        .eq("learner_id", payment.learner_id)
        .eq("payment_type", "demo")
        .in("status", ["completed", "upgraded"]);
      demoSkip = Math.min(
        completedDemoPayments?.length ?? 0,
        totalCourseLessons,
      );
    }
    const remainingLessons = Math.max(0, totalCourseLessons - demoSkip);
    const fullUnlock = Array.from(
      { length: remainingLessons },
      (_, i) => i + 1 + demoSkip,
    );

    if (installmentType === "full") {
      unlockedLessons = fullUnlock;
      newPaymentStatus = "full_paid";
    } else if (installmentType === "first_half") {
      unlockedLessons = getHalfPaymentLessons(remainingLessons).map(
        (n) => n + demoSkip,
      );
      newPaymentStatus = "half_paid";
    } else if (
      installmentType === "second_half" &&
      enrollment.payment_status === "half_paid"
    ) {
      unlockedLessons = fullUnlock;
      newPaymentStatus = "full_paid";
    }

    const { error: enrollmentError } = await supabaseClient
      .from("enrollment")
      .update({
        payment_status: newPaymentStatus,
        unlocked_lessons: unlockedLessons,
        status: "active",
        progress: {
          completed_lessons: enrollment.progress?.completed_lessons || [],
          current_lesson: enrollment.progress?.current_lesson || 1,
          last_accessed: new Date().toISOString(),
        },
      })
      .eq("id", enrollment.id);
    if (enrollmentError) throw enrollmentError;
  } else if (paymentType === "reschedule") {
    const { error: scheduleError } = await supabaseClient
      .from("Schedule")
      .update({ status: "confirmed", payment_confirmed: true })
      .eq("payment_id", paymentId);
    if (scheduleError) throw scheduleError;
  } else if (paymentType === "demo") {
    const { data: enrollment, error: enrollmentQueryError } =
      await supabaseClient
        .from("enrollment")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();
    if (enrollmentQueryError) throw enrollmentQueryError;

    const demoProgress = {
      type: "demo",
      total_hours: 1,
      completed_lessons: [],
      current_lesson: 1,
      last_accessed: new Date().toISOString(),
    };

    if (!enrollment) {
      const { error: recreateError } = await supabaseClient
        .from("enrollment")
        .insert([
          {
            learner_id: payment.learner_id,
            course_id: null,
            payment_id: paymentId,
            status: "active",
            payment_status: "full_paid",
            installment_mode: "full",
            unlocked_lessons: [1],
            progress: demoProgress,
          },
        ]);
      if (recreateError) throw recreateError;
    } else {
      const { error: enrollmentError } = await supabaseClient
        .from("enrollment")
        .update({
          payment_status: "full_paid",
          unlocked_lessons: [1],
          status: "active",
          progress: demoProgress,
        })
        .eq("id", enrollment.id);
      if (enrollmentError) throw enrollmentError;
    }

    const { data: prePaidSchedules } = await supabaseClient
      .from("Schedule")
      .select("id")
      .eq("learner_id", payment.learner_id)
      .eq("status", "pending_payment");

    if (prePaidSchedules && prePaidSchedules.length > 0) {
      await supabaseClient
        .from("Schedule")
        .update({ status: "booked" })
        .eq("learner_id", payment.learner_id)
        .eq("status", "pending_payment");
    } else {
      const { data: existingReq } = await supabaseClient
        .from("reschedule_requests")
        .select("id")
        .eq("learner_id", payment.learner_id)
        .eq("type", "new")
        .eq("status", "pending")
        .maybeSingle();
      if (!existingReq) {
        await supabaseClient.from("reschedule_requests").insert({
          learner_id: payment.learner_id,
          lesson_ids: ["virtual-lesson-1"],
          amount: 0,
          status: "pending",
          type: "new",
        });
      }
    }
  } else if (paymentType === "topup") {
    const { data: enrollment, error: enrollmentQueryError } =
      await supabaseClient
        .from("enrollment")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();
    if (enrollmentQueryError) throw enrollmentQueryError;

    const topupHours =
      enrollment?.progress?.total_hours ||
      Math.max(1, Math.round((payment.amount || 1) / 1));
    const unlockedLessons = Array.from(
      { length: topupHours },
      (_, i) => i + 1,
    );
    const topupProgress = {
      type: "topup",
      total_hours: topupHours,
      completed_lessons: [],
      current_lesson: 1,
      last_accessed: new Date().toISOString(),
    };

    if (!enrollment) {
      const { error: recreateError } = await supabaseClient
        .from("enrollment")
        .insert([
          {
            learner_id: payment.learner_id,
            course_id: null,
            payment_id: paymentId,
            status: "active",
            payment_status: "full_paid",
            installment_mode: "full",
            unlocked_lessons: unlockedLessons,
            progress: topupProgress,
          },
        ]);
      if (recreateError) throw recreateError;
    } else {
      const { error: enrollmentError } = await supabaseClient
        .from("enrollment")
        .update({
          payment_status: "full_paid",
          unlocked_lessons: unlockedLessons,
          status: "active",
          progress: topupProgress,
        })
        .eq("id", enrollment.id);
      if (enrollmentError) throw enrollmentError;
    }

    const { data: prePaidTopupSchedules } = await supabaseClient
      .from("Schedule")
      .select("id")
      .eq("learner_id", payment.learner_id)
      .eq("status", "pending_payment");

    if (prePaidTopupSchedules && prePaidTopupSchedules.length > 0) {
      await supabaseClient
        .from("Schedule")
        .update({ status: "booked" })
        .eq("learner_id", payment.learner_id)
        .eq("status", "pending_payment");
    } else {
      // Don't create a second pending "new" request if one already exists —
      // this payment path can run twice (webhook + client callback), and a
      // duplicate pending request leaks the learner into the admin New
      // Schedules tab even after they've been scheduled.
      const { data: existingReq } = await supabaseClient
        .from("reschedule_requests")
        .select("id")
        .eq("learner_id", payment.learner_id)
        .eq("type", "new")
        .eq("status", "pending")
        .maybeSingle();
      if (!existingReq) {
        const lessonIds = Array.from(
          { length: topupHours },
          (_, i) => `virtual-lesson-${i + 1}`,
        );
        await supabaseClient.from("reschedule_requests").insert({
          learner_id: payment.learner_id,
          lesson_ids: lessonIds,
          amount: 0,
          status: "pending",
          type: "new",
        });
      }
    }
  } else if (paymentType === "custom") {
    const { data: enrollment, error: enrollmentQueryError } =
      await supabaseClient
        .from("enrollment")
        .select("*")
        .eq("payment_id", paymentId)
        .single();
    if (enrollmentQueryError) throw enrollmentQueryError;
    if (!enrollment) throw new Error("Custom enrollment not found");

    const totalHours = enrollment.progress?.total_hours || 10;
    const lessonsToUnlock = Math.min(Math.ceil(totalHours / 1), 10);
    let unlockedLessons = enrollment.unlocked_lessons || [];
    let newPaymentStatus = enrollment.payment_status;

    if (installmentType === "full") {
      unlockedLessons = Array.from(
        { length: lessonsToUnlock },
        (_, i) => i + 1,
      );
      newPaymentStatus = "full_paid";
    } else if (installmentType === "first_half") {
      unlockedLessons = getHalfPaymentLessons(totalHours);
      newPaymentStatus = "half_paid";
    } else if (
      installmentType === "second_half" &&
      enrollment.payment_status === "half_paid"
    ) {
      unlockedLessons = Array.from(
        { length: lessonsToUnlock },
        (_, i) => i + 1,
      );
      newPaymentStatus = "full_paid";
    }

    const { error: enrollmentError } = await supabaseClient
      .from("enrollment")
      .update({
        payment_status: newPaymentStatus,
        unlocked_lessons: unlockedLessons,
        status: "active",
        progress: {
          ...enrollment.progress,
          completed_lessons: enrollment.progress?.completed_lessons || [],
          current_lesson: enrollment.progress?.current_lesson || 1,
          last_accessed: new Date().toISOString(),
        },
      })
      .eq("id", enrollment.id);
    if (enrollmentError) throw enrollmentError;
  }

  try {
    await supabaseClient.functions.invoke("send-message", {
      body: {
        message_type: "WEBAPP_THANK_YOU_FOR_PAYMENT_GENERIC",
        learner_id: payment.learner_id,
        payment_amount: payment.amount,
      },
    });
  } catch (msgErr) {
    console.error("Error invoking send-message:", msgErr);
  }

  return {
    alreadyCompleted: false,
    paymentId,
    paymentType,
    learnerId: payment.learner_id,
  };
}
