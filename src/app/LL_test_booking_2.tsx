import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";

export default function LL_test_booking_2() {
  const { navId } = useParams();
  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">
            {navId === "1" ? <>LL Test Booking (with Aadhaar)</> : null}
            {navId === "2" ? <>LL Test Booking (without Aadhaar)</> : null}
          </h1>
          <div className="w-6" />
        </div>
        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* video with Aadhar */}
          {navId === "1" ? (
            <video
              src="https://videocdn.cdnpk.net/videos/e80ff838-ac7f-446d-80cc-8cc36bb50d24/horizontal/previews/clear/large.mp4?token=exp=1726169365~hmac=37c17894cf7ad769b5988850e7f694e3202a004c21af0f6fc8811f33b14ff9f6" // Replace with your video source URL
              autoPlay // Automatically plays the video
              muted // Mute the video (autoplay often requires muted)
              loop // Loops the video
              controls // Shows video controls (play, pause, etc.)
              poster="/assets/video-poster-1.png" // Poster image for video
              width="600" // Set width for the video
            >
              Your browser does not support the video tag.
            </video>
          ) : null}

          {/* video without Aadhar */}
          {navId === "2" ? (
            <video
              src="https://videocdn.cdnpk.net/videos/e80ff838-ac7f-446d-80cc-8cc36bb50d24/horizontal/previews/clear/large.mp4?token=exp=1726169365~hmac=37c17894cf7ad769b5988850e7f694e3202a004c21af0f6fc8811f33b14ff9f6" // Replace with your video source URL
              autoPlay // Automatically plays the video
              muted // Mute the video (autoplay often requires muted)
              loop // Loops the video
              controls // Shows video controls (play, pause, etc.)
              poster="/assets/video-poster-1.png" // Poster image for video
              width="600" // Set width for the video
            >
              Your browser does not support the video tag.
            </video>
          ) : null}
        </div>

        <div className="flex flex-row justify-center gap-4">
          <a
            target="_blank"
            href="https://parivahan.gov.in/parivahan/"
            rel="noreferrer"
          >
            <Button className="mt-auto w-[240px]" variant={"purple"}>
              Go to the Parivahan Website
            </Button>
          </a>
          <Link to="/bookll-3">
            <Button className="mt-auto" variant={"purple"}>
              Next
            </Button>
          </Link>
        </div>
      </div>
    </PurpleGradient>
  );
}
