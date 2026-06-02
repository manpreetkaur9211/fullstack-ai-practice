"use client";
import { use } from "react";

export const ProfileSection = ({ profilePromise }: { profilePromise: Promise<{ name: string; email: string }> }) => {
    const profile=use(profilePromise);
    return (
        <div>
            <h2>Profile</h2>
            <p>Name: {profile.name}</p>
            <p>Email: {profile.email}</p>
        </div>
    );
};


