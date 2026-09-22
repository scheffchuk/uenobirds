import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      // Callback includes iss (RFC 9207). Must match GitHub's value exactly.
      issuer: "https://github.com/login/oauth",
    }),
  ],
});
