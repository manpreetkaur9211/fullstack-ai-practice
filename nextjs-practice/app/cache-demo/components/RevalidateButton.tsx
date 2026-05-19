"use client";
import { revalidateProfile } from "../actions";

export const RevalidateButton = () => {
    return ( <button onClick={async () => {
                await revalidateProfile();
                alert("Profile cache revalidated!");
            }}>Refresh Profile</button>
    );
}