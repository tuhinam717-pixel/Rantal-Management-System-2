import { SplashScreen } from "@/components/auth/splash-screen";
import { getSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";

export default async function SplashPage() {
  const session = await getSession();
  const href = session ? ROLE_HOME[session.role] : "/login";

  return <SplashScreen href={href} />;
}
