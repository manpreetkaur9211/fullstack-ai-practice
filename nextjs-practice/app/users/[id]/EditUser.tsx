"use client";
import { User } from "@/lib/types";
import { useState } from "react";
import { EditForm } from "./EditForm";

export const EditUser = (user: User) => {
     const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? (
        <EditForm user={user} />
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      )}
    </div>
  );
}