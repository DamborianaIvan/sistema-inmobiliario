export const ENTIDADES_AUDITORIA = Object.freeze(
  Object.fromEntries(
    ["USUARIO", "PROPIEDAD", "PROPIETARIO", "CONFIGURACION"].map((x) => [x, x]),
  ),
);
export const ACCIONES_AUDITORIA = Object.freeze(
  Object.fromEntries(
    [
      "USUARIO_CREADO",
      "USUARIO_ACTUALIZADO",
      "USUARIO_ESTADO_CAMBIADO",
      "USUARIO_PASSWORD_CAMBIADO",
      "PROPIEDAD_CREADA",
      "PROPIEDAD_ACTUALIZADA",
      "PROPIETARIO_CREADO",
      "PROPIETARIO_ACTUALIZADO",
      "CONFIGURACION_ACTUALIZADA",
    ].map((x) => [x, x]),
  ),
);
