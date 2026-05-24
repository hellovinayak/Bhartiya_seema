import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { isFirebaseConfigured, storage } from '../firebase/firebase';

export const uploadIncidentMedia = async (
  incidentId: string,
  file: File,
  onProgress?: (progress: number) => void,
) => {
  if (!isFirebaseConfigured || !storage) {
    onProgress?.(100);
    return URL.createObjectURL(file);
  }

  const mediaRef = ref(storage, `incident-media/${incidentId}/${Date.now()}-${file.name}`);
  const task = uploadBytesResumable(mediaRef, file);

  return new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress);
      },
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
};
