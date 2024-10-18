import { ArrowLeft, LogOut } from "lucide-react"; // Import LogOut icon
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useLearner, useLearnerUpdate } from "@/queries/learner";

export default function Profile2() {
  const { data: learner, isLoading, error } = useLearner();
  const { mutate: updateLearner } = useLearnerUpdate();
  const navigate = useNavigate();
  const { logout } = useAuth(); // Get logout function from useAuth

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(learner?.name || "");
  const [birthday, setBirthday] = useState(learner?.dob || "");
  const [email, setEmail] = useState(learner?.email || "");

  useEffect(() => {
    if (learner) {
      setName(learner.name || "");
      setBirthday(learner.dob || "");
      setEmail(learner.email || "");
    }
  }, [learner]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleSave = () => {
    updateLearner({
      name,
      dob: birthday,
      email,
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="container mx-auto flex min-h-screen flex-col p-4">
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>
      <div className="flex-grow space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={learner?.phone || ""} disabled />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          {isEditing ? (
            <div className="space-x-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </div>
      <div className="mt-auto pb-20">
        <Button onClick={handleLogout} variant="destructive" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
