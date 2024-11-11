import {
  CreditCard,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import LANE from "/assets/lane.svg";
import { Card, CardContent } from "@/components/ui/card";

export default function Profile() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="mt-12 min-h-screen p-4">
      <Card className="mx-auto flex w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl">
        <img
          src={LANE}
          alt="Lane Logo"
          className="mb-12 mt-6 h-32 w-48"
          style={{ display: isLoaded ? "block" : "none" }}
        />
        <CardContent className="space-y-6 px-4 pb-6 sm:px-6 sm:pb-8">
          <div className="space-y-4">
            {[
              { icon: <User />, label: "Name", value: "John Doe" },
              { icon: <Phone />, label: "Phone", value: "+1 (555) 123-4567" },
              {
                icon: <MapPin />,
                label: "Address",
                value: "123 Main St, Anytown, USA 12345",
              },
              { icon: <Mail />, label: "Email", value: "john.doe@example.com" },
              {
                icon: <CreditCard />,
                label: "Driver's License",
                value: "DL1234567890",
              },
              {
                icon: <GraduationCap />,
                label: "Learner's License",
                value: "LL9876543210",
              },
            ].map((item, index) => (
              <ProfileItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                delay={index * 100}
                isLoaded={isLoaded}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileItem({
  icon,
  label,
  value,
  delay,
  isLoaded,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
  isLoaded: boolean;
}) {
  return (
    <div
      className="group flex items-center space-x-4 rounded-lg p-3 transition-colors duration-200 hover:bg-gray-50"
      style={{
        transform: `translateY(${isLoaded ? "0" : "20px"})`,
        opacity: isLoaded ? 1 : 0,
        transition: `transform 0.5s ease-out ${delay}ms, opacity 0.5s ease-out ${delay}ms`,
      }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00CE84] text-white transition-transform duration-200 group-hover:scale-110">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-base font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
