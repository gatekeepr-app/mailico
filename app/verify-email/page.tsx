import VerifyEmailForm from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const params = await searchParams;
  const value = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
  return <VerifyEmailForm initialEmail={initialEmail} />;
}
