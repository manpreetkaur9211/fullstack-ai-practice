"use server";

import {revalidatePath} from "next/cache";

 export const revalidateProfile = async () => {
    revalidatePath("/user-profile");  
}