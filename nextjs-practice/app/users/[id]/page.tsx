 import {getUser} from "@/lib/data";
import { UserDisplay } from "./UserDisplay";
import { EditUser } from "./EditUser";
 export default async function UserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const user = await getUser(id);
    return (
        <div>   

            <UserDisplay user={user} />
            <EditUser {...user} />
        </div>
    );
}

