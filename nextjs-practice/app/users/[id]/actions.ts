export const updateUser = async (user: { id: string; name: string; email: string; bio: string }) => {   
    await new Promise(r => setTimeout(r, 1000));
    console.log("Updated user:", user);
    return { user: user };
}