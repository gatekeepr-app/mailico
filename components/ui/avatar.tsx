"use client";

import { useState } from "react";
import { getAvatarGradient, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-sm",
  xl: "h-14 w-14 text-lg",
} as const;

export type AvatarSize = keyof typeof avatarSizes;

interface AvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  alt?: string;
}

export function Avatar({
  name,
  imageUrl,
  size = "md",
  className,
  alt,
}: AvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const normalizedImageUrl = imageUrl?.trim();
  const displayName = name?.trim() || "User";
  const shouldShowImage = Boolean(normalizedImageUrl) && normalizedImageUrl !== failedImageUrl;

  const sharedClassName = cn(
    "shrink-0 overflow-hidden rounded-full",
    avatarSizes[size],
    className,
  );

  if (shouldShowImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Arbitrary tiny avatar URLs may not be configured for next/image.
      <img
        src={normalizedImageUrl}
        alt={alt ?? `${displayName} profile photo`}
        className={cn(sharedClassName, "object-cover")}
        onError={() => setFailedImageUrl(normalizedImageUrl ?? null)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${displayName} avatar`}
      className={cn(
        sharedClassName,
        "flex items-center justify-center font-semibold leading-none text-white",
      )}
      style={{ background: getAvatarGradient(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
