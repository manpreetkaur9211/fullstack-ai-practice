Look at this component. Find all the problems and explain why each is wrong:

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

1. db access in client component: Create specific Server component that fetch user from database
2. Client component state toggle.
3. Client component for editing User. and seperate Server component for showing users details