
```tsx
"use client";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
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
```
Take the broken component above and refactor it into:
- `UserPage` — Server Component that fetches the user from database
- `UserDisplay` — Server Component showing the user data
- `EditUser` — Client Component with the toggle behaviour
- `EditForm` — Client Component for editing

Draw the component tree showing what runs where.

UserPage: runs on server. awaits for user data then renders ui at build time. or on params change
UseDisplay: Runs on server. 
EditUser: Client component render on Client side.
Edit Form: runs on client. usages form actions to updateUser.