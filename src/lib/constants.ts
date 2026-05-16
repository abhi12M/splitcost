export const APP_NAME = "SplitCost";
export const LOCAL_GROUPS_KEY = "my_groups";
/** Logical key prefix for per-group "who are you?" viewer member id (see groupViewer.ts). */
export const LOCAL_GROUP_VIEWER_KEY_PREFIX = "sc_group_viewer_";
export const LOCAL_CURRENCY_KEY = "my_currency";
export const ADMIN_PARENT_PATH = "/portal";
export const ADMIN_CHILD_PATH = "x7k2p9";
export const ADMIN_BASE_PATH = `${ADMIN_PARENT_PATH}/${ADMIN_CHILD_PATH}`;
export const ADMIN_SESSION_KEY = "admin_session";
export const ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID ?? "admin";
export const ADMIN_LOGIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD ?? "";
