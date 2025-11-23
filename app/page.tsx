import { getSession } from "@/lib/auth/services/auth.service";

export default async function Home() {
  const session = await getSession()

  return (
    <main>
      <h1>Hello World</h1>
      {session ? (
        <>
          <p>User ID: {session.userId}</p>
          <p>UID: {session.uid}</p>
          <p>Roles: {session.roles?.join(', ')}</p>
          <p>Name: {session.name}</p>
          <p>Email: {session.email}</p>
          <p>Username: {session.username}</p>
          <p>User Type: {session.userType}</p>
          <p>Require Password Change: {session.requirePasswordChange ? 'Yes' : 'No'}</p>
        </>
      ) : (
        <p>Not authenticated</p>
      )}
    </main>
  );
}
