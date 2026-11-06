// Liveness probe used by the Docker HEALTHCHECK and external monitors.
export function GET() {
  return Response.json({ status: "ok" });
}
