export const UserProfile = ({ name, email }: { name: string; email: string }) => {
    return (
        <div className="p-4 bg-white rounded-md shadow-md"> 

            <h2 className="text-xl font-semibold text-gray-800 mb-2">User Profile</h2>
            <p className="text-gray-700"><strong>Name:</strong> {name}</p>
            <p className="text-gray-700"><strong>Email:</strong> {email}</p>            
        </div>
    );
}