import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { UpdateProfilePayload, UserProfile } from "@/types/api";

export const userService = {
  getProfile() {
    return apiClient.get<UserProfile>(apiEndpoints.userProfile, {
      metadata: { source: "userService.getProfile" },
    });
  },

  updateProfile(payload: UpdateProfilePayload) {
    return apiClient.patch<UserProfile>(apiEndpoints.userProfile, {
      body: payload,
      metadata: { source: "userService.updateProfile" },
    });
  },
};
