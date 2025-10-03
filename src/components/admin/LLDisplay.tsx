import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  ImageOff,
  RefreshCw,
  Download,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";

interface LearnerLLDisplayProps {
  learnerPhone: string;
}

export const LearnerLLDisplay = ({ learnerPhone }: LearnerLLDisplayProps) => {
  const [llImages, setLlImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLLImages = async () => {
    if (!learnerPhone) {
      setError("No phone number available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // List files from the LL bucket in the folder matching the phone number
      const { data, error } = await supabase.storage
        .from("LL")
        .list(learnerPhone);

      // console.log("LL data", data);
      if (error) throw error;

      if (data && data.length > 0) {
        // Create signed URLs for each file
        const signedUrls = await Promise.all(
          data.map(async (file) => {
            const { data: signedUrlData } = await supabase.storage
              .from("LL")
              .createSignedUrl(`${learnerPhone}/${file.name}`, 3600); // 1 hour expiry

            return signedUrlData?.signedUrl || null;
          }),
        );

        // Filter out any null values and set the state
        setLlImages(signedUrls.filter(Boolean) as string[]);
      } else {
        setLlImages([]);
      }
    } catch (err) {
      console.error("Error fetching LL images:", err);
      setError("Failed to fetch learner license images");
    } finally {
      setLoading(false);
    }
  };

  // Only fetch when the component is mounted and we have a phone number
  useEffect(() => {
    if (learnerPhone) {
      fetchLLImages();
    }
  }, [learnerPhone]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50 p-5">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-gray-500">Loading license images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-lg bg-gray-50 p-5">
        <ImageOff className="mb-2 h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  if (llImages.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-lg bg-gray-50 p-5">
        <ImageOff className="mb-2 h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-500">No license images found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Learner License</h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {llImages.map((url, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-md border bg-white shadow-sm"
          >
            <div className="relative">
              <img
                src={url}
                alt={`Learner License ${index + 1}`}
                className="w-full object-cover"
                style={{ maxHeight: "280px" }}
              />
              <a
                href={url}
                download={`learner-license-${index + 1}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
              >
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </a>
            </div>
            <div className="p-2 text-center text-xs text-gray-500">
              License Image {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
