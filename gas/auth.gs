function requireAuth_(data) {
  const expected = PropertiesService.getScriptProperties().getProperty("AUTH_TOKEN");
  const got = String((data && data.token) || "");

  if (!expected) throw new Error("ServerMisconfig: AUTH_TOKEN is not set");
  if (!got || got !== expected) throw new Error("Unauthorized");
}
