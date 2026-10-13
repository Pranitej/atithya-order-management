import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { buttonStyles } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export default function NotFound() {
  return (
    <PageShell className="max-w-3xl">
      <Notice
        title="That page is not on the menu"
        action={
          <Link href="/" className={buttonStyles()}>
            Back to the menu
          </Link>
        }
      >
        The address may be mistyped, or the page may have moved.
      </Notice>
    </PageShell>
  );
}
