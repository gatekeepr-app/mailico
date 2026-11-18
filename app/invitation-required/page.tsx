import Link from "next/link";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitationRequiredPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f0] px-4 py-8 text-[#1c2824]">
      <Card className="w-full max-w-lg rounded-none border-[#d9ddd6] shadow-none">
        <CardHeader>
          <span className="mb-2 flex size-10 items-center justify-center bg-[#193e37] text-white"><EnvelopeSimple size={19} /></span>
          <CardTitle className="text-2xl font-medium">Workspace access is required</CardTitle>
          <CardDescription>
            Mailico company accounts are invite-only. Ask your administrator to invite or restore access for your primary email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          If your access was removed, your administrator can reissue an invitation. Your company email and mailbox history will be restored with your account.
        </CardContent>
        <CardFooter className="border-t border-[#e5e8e1] pt-4">
          <Button asChild className="min-h-11 rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
            <Link href="/login">Return to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
