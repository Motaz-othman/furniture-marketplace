import api from '@/lib/axios';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  // Do NOT set Content-Type manually — axios must auto-set it with the multipart boundary
  const { data } = await api.post('/upload/image', formData);
  return data.url;
}
