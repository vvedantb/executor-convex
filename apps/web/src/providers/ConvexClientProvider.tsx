import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useStableAuth } from "@/hooks/useStableAuth";
import { convex } from "@/lib/convex";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useStableAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
