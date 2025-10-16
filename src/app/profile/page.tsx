'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  profile_photo?: string;
  createdAt: string;
}

interface ProfilePhotoState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

export default function ProfilePage() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Profile photo state
  const [profilePhotoState, setProfilePhotoState] = useState<ProfilePhotoState>({
    file: null,
    preview: null,
    uploading: false,
  });

  // State for delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch user profile
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [isLoggedIn, router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          name: userData.name,
          email: userData.email,
        }));
      } else {
        if (response.status === 401) {
          logout();
          router.push('/login');
        } else {
          console.error('Failed to fetch profile');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const updateData = {
        name: formData.name,
        email: formData.email,
        ...(formData.newPassword && {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        // Update localStorage with new name if changed
        if (updatedUser.name !== localStorage.getItem('user')) {
          localStorage.setItem('user', updatedUser.name);
        }
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        toast.success('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (response.ok) {
        logout();
        router.push('/');
        toast.success('Account deleted successfully');
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  // Skeleton Loader Component
  const ProfileSkeleton = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-9 bg-gray-300 rounded w-48 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-80"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          {/* Profile Form Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-6 bg-gray-300 rounded w-32 mb-6"></div>
              <div className="space-y-6">
                {/* Name Field */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                {/* Email Field */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                {/* Password Fields */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                {/* Button */}
                <div className="flex justify-end">
                  <div className="h-10 bg-gray-300 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6 animate-pulse">
            {/* Profile Photo Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-5 bg-gray-300 rounded w-28 mb-4"></div>
              <div className="flex flex-col items-center space-y-4">
                {/* Profile Photo Circle */}
                <div className="w-32 h-32 bg-gray-300 rounded-full"></div>
                {/* Buttons */}
                <div className="w-28 h-10 bg-gray-300 rounded"></div>
              </div>
            </div>

            {/* Account Info Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-300 rounded w-36 mb-4"></div>
              <div className="space-y-3">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Failed to load profile.</p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline"
          >
            Go back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {loading ? (
            <>
              <div className="h-9 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-64"></div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-2">
                Manage your account settings and preferences
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Edit Profile
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {loading ? (
                    <div className="h-10 bg-gray-200 rounded"></div>
                  ) : (
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  )}
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  {loading ? (
                    <div className="h-10 bg-gray-200 rounded"></div>
                  ) : (
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  )}
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password (Required to change password)
                  </label>
                  {loading ? (
                    <div className="h-10 bg-gray-200 rounded"></div>
                  ) : (
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password (Optional)
                  </label>
                  {loading ? (
                    <div className="h-10 bg-gray-200 rounded"></div>
                  ) : (
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  {loading ? (
                    <div className="h-10 bg-gray-200 rounded"></div>
                  ) : (
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  {loading ? (
                    <div className="w-32 h-10 bg-gray-300 rounded"></div>
                  ) : (
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Photo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Profile Photo
              </h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {loading ? (
                    <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                  ) : user?.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {loading ? (
                  <div className="w-28 h-10 bg-gray-300 rounded"></div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProfilePhotoState(prev => ({
                          ...prev,
                          file,
                          preview: URL.createObjectURL(file),
                        }));
                      }
                    }}
                    className="hidden"
                    id="profile-photo-input"
                  />
                )}

                {loading ? (
                  <div className="w-32 h-10 bg-gray-200 rounded"></div>
                ) : (
                  <label
                    htmlFor="profile-photo-input"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-300"
                  >
                    Choose Photo
                  </label>
                )}

                {loading ? (
                  <div className="w-28 h-10 bg-gray-200 rounded"></div>
                ) : profilePhotoState.file && (
                  <button
                    onClick={async () => {
                      if (!profilePhotoState.file) return;

                      setProfilePhotoState(prev => ({ ...prev, uploading: true }));

                      try {
                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('profile_photo', profilePhotoState.file!);

                        const token = localStorage.getItem('token');
                        if (!token) return;

                        const response = await fetch('/api/profile', {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                          body: formData,
                        });

                        if (response.ok) {
                          const updatedUser = await response.json();
                          setUser(updatedUser);
                          setProfilePhotoState({ file: null, preview: null, uploading: false });
                          toast.success('Profile photo updated successfully!');
                        } else {
                          const errorData = await response.json();
                          toast.error(errorData.error || 'Failed to update profile photo');
                        }
                      } catch (error) {
                        console.error('Error uploading photo:', error);
        toast.error('Failed to upload profile photo');
                      } finally {
                        setProfilePhotoState(prev => ({ ...prev, uploading: false }));
                      }
                    }}
                    disabled={profilePhotoState.uploading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    {profilePhotoState.uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Member since</p>
                  {loading ? (
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account ID</p>
                  {loading ? (
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  ) : (
                    <p className="text-sm font-mono text-gray-900">{user.id.slice(0, 8)}...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone - Only show when not loading */}
            {!loading && (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4">
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-300"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal - Only show when not loading */}
      {!loading && showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Account
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. This will permanently delete your account and all associated data.
            </p>
            <div className="mb-4">
              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your password to confirm
              </label>
              <input
                type="password"
                id="deletePassword"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Your password"
              />
              {deleteError && (
                <p className="mt-1 text-sm text-red-600">{deleteError}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
