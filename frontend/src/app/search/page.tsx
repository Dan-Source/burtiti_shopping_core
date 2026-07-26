"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Section } from "@/components";
import { Suspense, useEffect } from "react";

function SearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) {
      params.set("search", query);
    }
    router.replace(params.toString() ? `/products?${params.toString()}` : "/products");
  }, [query, router]);

  return <Section className="py-6">Redirecionando...</Section>;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Section className="py-6">Carregando...</Section>}>
      <SearchRedirect />
    </Suspense>
  );
}
