import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

export const { Link, redirect, usePathname, getPathname } = createNavigation(routing);

// Offline, `push` and `replace` open the page without asking the server.
export { useOfflineAwareRouter as useRouter } from "./useOfflineAwareRouter";
