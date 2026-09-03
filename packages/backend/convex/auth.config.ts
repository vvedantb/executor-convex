const clerkDomain = process.env.CLERK_FRONTEND_API_URL;

export default {
  providers: clerkDomain
    ? [
        {
          domain: clerkDomain,
          applicationID: "convex",
        },
      ]
    : [],
};
