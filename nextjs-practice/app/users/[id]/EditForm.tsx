"use client";

import { useActionState } from "react";
import { updateUser } from "./actions";

interface FormState {
  success: boolean;
  error: string | null;
}

export const EditForm = ({ user }: { user: { id: string; name: string; email: string; bio: string } }) => {
    const [ state, updateUserAction,isPending] = useActionState(async (prevState: FormState, formData: FormData) => {
      try {
        await updateUser(user);
        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    { success: false, error: null });
    return (
        <div>
            <h2>Edit User</h2>
            <form action= {updateUserAction} method="post">
                <label>

                    Name:
                    <input type="text" defaultValue={user.name} />
                </label>                    
                <br />
                <label>
                    Email:

                    <input type="email" defaultValue={user.email} />
                </label>
                <br />
                <label>
                    Bio:
                    <textarea defaultValue={user.bio} />
                </label>
                <br />

                <button disabled={isPending} type="submit">
                    {isPending ? "Saving..." : "Save"}
                </button>
            </form>
        </div>
    );
}