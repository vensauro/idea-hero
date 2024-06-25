import { ComponentProps, ReactNode } from "react";
import { UsersBar } from "../users-bar/users-bar";

type PageWithUsersBarProps = {
  children: ReactNode;
} & ComponentProps<typeof UsersBar>;

export function PageWithUsersBar(props: PageWithUsersBarProps) {
  return (
    <main className="min-h-screen flex flex-col ">
      <UsersBar activeUserId={props.activeUserId} users={props.users} />
      {props.children}
    </main>
  );
}
