import { label } from "../domain";

export default function AuditDetail({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <p>Sin datos</p>;
  return (
    <dl>
      {Object.entries(value)
        .filter(([k]) => !["_id", "__v"].includes(k))
        .map(([k, v]) => (
          <div key={k}>
            <dt>{label(k)}</dt>
            <dd>
              {v && typeof v === "object" ? (
                <AuditDetail value={v} />
              ) : (
                String(v ?? "Sin datos")
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
