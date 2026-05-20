import request from '../api/client';

export async function uploadToCloudinary(file, folder) {
  const sig = await request('/media/signature', { folder });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', String(sig.timestamp));
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);
  formData.append('context', sig.context);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Error al subir archivo');
  }

  const saved = await request('/media/commit', {
    public_id: uploadData.public_id,
    secure_url: uploadData.secure_url,
    resource_type: uploadData.resource_type,
    format: uploadData.format,
    bytes: uploadData.bytes,
    width: uploadData.width,
    height: uploadData.height,
    duration: uploadData.duration,
  });

  return { cloudinary: uploadData, asset: saved };
}
