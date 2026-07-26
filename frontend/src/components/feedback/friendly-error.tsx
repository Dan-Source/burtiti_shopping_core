import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";

type FriendlyErrorProps = {
  title: string;
  description: string;
  onRetry?: () => void;
  redirectHref?: string;
  redirectLabel?: string;
};

export function FriendlyError({
  title,
  description,
  onRetry,
  redirectHref,
  redirectLabel = "Ir para login",
}: FriendlyErrorProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button type="button" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
          {redirectHref ? (
            <Link
              href={redirectHref}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              {redirectLabel}
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
