import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnOperator = req.nextUrl.pathname.startsWith("/operator");
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");

  if (isOnDashboard || isOnOperator || isOnAdmin) {
    if (isLoggedIn) {
      // Role-based protection for admin surfaces
      const userRole = (req.auth?.user as any)?.role?.toLowerCase();
      if ((isOnOperator || isOnAdmin) && userRole !== "admin") {
        return Response.redirect(new URL("/", req.nextUrl));
      }
      return;
    }
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
