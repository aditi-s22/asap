import React, { useState } from 'react';
import { uploadImages } from '../services/api';

const MAX_IMAGES = 10;

// Multi-image upload widget for parking listings — uploads each selected file to
// Cloudinary via the shared /upload/images endpoint and reports the resulting
// {url, public_id} array back to the parent form. Used by the "Add Parking Space"
// and "Edit Listing" modals in HostDashboard.
export default function ListingImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) {
      setError('Each image must be under 5MB.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const res = await uploadImages(formData);
      onChange([...images, ...res.data]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">Parking Space Photos</label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img.public_id || i} className="relative group aspect-square">
              <img src={img.url} alt={`Parking ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <div className="relative border-2 border-dashed border-slate-300 hover:border-parking-400 rounded-xl p-6 text-center bg-slate-50 transition-colors cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFiles}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-6 h-6 border-2 border-parking-200 border-t-parking-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Uploading...</p>
            </div>
          ) : (
            <div className="py-2">
              <span className="material-symbols-outlined text-2xl text-parking-600 mb-1">add_a_photo</span>
              <p className="text-xs text-slate-500 font-medium">Click to add photos (1–{MAX_IMAGES}, JPEG/PNG, max 5MB each)</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {images.length === 0 && !error && (
        <p className="text-xs text-slate-400">At least one parking image is required.</p>
      )}
    </div>
  );
}
