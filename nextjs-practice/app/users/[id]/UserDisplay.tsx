export const UserDisplay = ({ user }: { user: { id: string; name: string; email: string; bio: string } }) => {
    return (
        <div>   
            <h1>User Profile</h1>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p> 
            <p><strong>Bio:</strong> {user.bio}</p>
        </div>
    );
}