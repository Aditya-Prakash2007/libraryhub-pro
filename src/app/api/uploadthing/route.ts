// Removed in favor of Cloudinary direct upload
export async function GET() {
  return new Response(JSON.stringify({ status: "disabled" }), { status: 404 });
}
export async function POST() {
  return new Response(JSON.stringify({ status: "disabled" }), { status: 404 });
}
