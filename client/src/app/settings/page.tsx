"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "@/app/(components)/Header";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setLanguage, setNotificationsEnabled } from "@/state";
import { updateUserProfile } from "@/state/userSlice";
import { apiClient } from "@/lib/apiClient";

const Settings = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.currentUser);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const notificationsEnabled = useAppSelector(
    (state) => state.global.notificationsEnabled
  );
  const language = useAppSelector((state) => state.global.language);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (typeof notificationsEnabled !== "boolean") {
      dispatch(setNotificationsEnabled(true));
    }
    if (!language) {
      dispatch(setLanguage("English"));
    }
  }, [dispatch, notificationsEnabled, language]);

  const isDirty = useMemo(() => {
    const trimmed = name.trim();
    return Boolean(user && trimmed && trimmed !== user.name);
  }, [name, user]);

  const handleSaveProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Name is required");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await apiClient.put("/users/me", { name: trimmed });
      const updated = response.data?.data;
      dispatch(updateUserProfile({
        name: updated?.name || trimmed,
        email: updated?.email || email,
      }));
      setMessage("Profile updated successfully");
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      setMessage(serverMessage || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full">
        <Header name="User Settings" />
        <div className="mt-6 text-sm text-gray-500">Loading user settings...</div>
      </div>
    );
  }

  const resolvedNotificationsEnabled = notificationsEnabled ?? true;
  const resolvedIsDarkMode = isDarkMode ?? false;
  const resolvedLanguage = language || "English";

  return (
    <div className="w-full">
      <Header name="User Settings" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Profile</h2>
            <p className="text-sm text-gray-500">Update your account details.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full border px-4 py-2 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Email updates are managed by admin.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
              <input
                type="text"
                value={user.role}
                readOnly
                className="w-full border px-4 py-2 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {message && (
            <p className="mt-4 text-sm text-gray-600">{message}</p>
          )}

          <div className="mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={!isDirty || saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Preferences</h2>
            <p className="text-sm text-gray-500">Customize your workspace.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Notifications</p>
                <p className="text-xs text-gray-400">Enable alert badges and updates.</p>
              </div>
              <label className="inline-flex relative items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={resolvedNotificationsEnabled}
                  onChange={() => dispatch(setNotificationsEnabled(!resolvedNotificationsEnabled))}
                />
                <div
                  className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-blue-400 peer-focus:ring-4 
                  transition peer-checked:after:translate-x-full peer-checked:after:border-white 
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
                  after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                  peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Dark Mode</p>
                <p className="text-xs text-gray-400">Toggle the app theme.</p>
              </div>
              <label className="inline-flex relative items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={resolvedIsDarkMode}
                  onChange={() => dispatch(setIsDarkMode(!resolvedIsDarkMode))}
                />
                <div
                  className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-blue-400 peer-focus:ring-4 
                  transition peer-checked:after:translate-x-full peer-checked:after:border-white 
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
                  after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                  peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Language</label>
              <select
                value={resolvedLanguage}
                onChange={(e) => dispatch(setLanguage(e.target.value))}
                className="w-full border px-4 py-2 rounded-lg"
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
