
import { Role } from "@/generated/prisma/client/index.js";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's role. */
      role: Role;
      /**
       * By default, TypeScript merges new interface properties.
       * Ref: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
       */
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    role: Role;
  }
}
