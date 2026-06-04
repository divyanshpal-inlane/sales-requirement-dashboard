import React, { createContext, useContext } from "react";
import { useCurrentAdmin } from "@/queries/adminPermissions";
import { useCurrentUser } from "@/queries/userManagement";

interface PhoneVisibilityContextType {
  canViewUnmaskedPhoneNumbers: boolean;
  isLoading: boolean;
}

const PhoneVisibilityContext = createContext<
  PhoneVisibilityContextType | undefined
>(undefined);

export function PhoneVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: currentAdmin, isLoading: adminLoading } = useCurrentAdmin();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Check if user is admin with permission, OR if user is a regular user with permission
  const canViewUnmaskedPhoneNumbers =
    currentAdmin?.is_super_admin ||
    currentAdmin?.permissions?.includes("view_unmasked_phone_numbers") ||
    currentUser?.permissions?.includes("view_unmasked_phone_numbers") ||
    false;

  const isLoading = adminLoading || userLoading;

  const value: PhoneVisibilityContextType = {
    canViewUnmaskedPhoneNumbers,
    isLoading,
  };

  return (
    <PhoneVisibilityContext.Provider value={value}>
      {children}
    </PhoneVisibilityContext.Provider>
  );
}

export function usePhoneVisibility() {
  const context = useContext(PhoneVisibilityContext);
  if (context === undefined) {
    throw new Error(
      "usePhoneVisibility must be used within a PhoneVisibilityProvider",
    );
  }
  return context;
}
