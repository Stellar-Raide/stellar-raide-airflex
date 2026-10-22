import { ProfilePageSkeleton } from "./skeletons";

/**
 * Route-level loading fallback for the profile segment.
 * Renders an immediate skeleton view with matching layout to prevent layout shift.
 */
export default function ProfileLoading() {
  return <ProfilePageSkeleton />;
}
