export const PERMISSIONS = Object.freeze({
  USERS_MANAGE: "USERS_MANAGE",
  CATALOG_READ: "CATALOG_READ",
  CATALOG_WRITE: "CATALOG_WRITE",
  SETTINGS_MANAGE: "SETTINGS_MANAGE",
  AUDIT_READ: "AUDIT_READ",
});
export const PERMISSIONS_VALUES = Object.values(PERMISSIONS);
export const hasPermission = (rol, permiso) =>
  PERMISSIONS_VALUES.includes(permiso) &&
  (rol === "ADMIN" ||
    (rol === "EMPLEADO" &&
      ["CATALOG_READ", "CATALOG_WRITE"].includes(permiso)));
