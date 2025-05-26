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
        .from("ll")
        .list(learnerPhone);

      if (error) throw error;

      if (data && data.length > 0) {
        // Create signed URLs for each file
        const signedUrls = await Promise.all(
          data.map(async (file) => {
            const { data: signedUrlData } = await supabase.storage
              .from("ll")
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
      <div className="flex justify-center items-center p-5 h-40 bg-gray-50 rounded-lg">
        <div className="flex flex-col gap-2 items-center">
          <div className="w-8 h-8 rounded-full border-4 animate-spin border-primary border-t-transparent"></div>
          <p className="text-sm text-gray-500">Loading license images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center p-5 h-40 bg-gray-50 rounded-lg">
        <ImageOff className="mb-2 w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 w-3 h-3" /> Retry
        </Button>
      </div>
    );
  }

  if (llImages.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-5 h-40 bg-gray-50 rounded-lg">
        <ImageOff className="mb-2 w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-500">No license images found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 w-3 h-3" /> Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-primary">Learner License</h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={fetchLLImages}
        >
          <RefreshCw className="mr-1 w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {llImages.map((url, index) => (
          <div
            key={index}
            className="overflow-hidden bg-white rounded-md border shadow-sm"
          >
            <div className="relative">
              <img
                src={url}
                alt={`Learner License ${index + 1}`}
                className="object-cover w-full"
                style={{ maxHeight: "280px" }}
              />
              <a
                href={url}
                download={`learner-license-${index + 1}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 bottom-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
              >
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </a>
            </div>
            <div className="p-2 text-xs text-center text-gray-500">
              License Image {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
