import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { useState } from "react";

type UseConvexImageUploadOptions = {
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: unknown) => void;
};

export function useConvexImageUpload(
  userId: Id<"users"> | null,
  opts?: UseConvexImageUploadOptions
) {
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateImageUploadUrl);
  const saveProfileImage = useMutation(api.users.saveProfileImage);

  const openImageLibrary = async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (!(permission.granted && userId)) {
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setUploading(true);
    try {
      const asset = result.assets[0];
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      await saveProfileImage({ userId, storageId });
      opts?.onSuccess?.(asset.uri);
    } catch (err) {
      opts?.onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return { openImageLibrary, uploading };
}
