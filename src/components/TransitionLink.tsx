"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

export default function TransitionLink({ children, href, ...props }: TransitionLinkProps) {
  const router = useRouter();

  const handleTransition = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // @ts-ignore - document.startViewTransition is still experimental in some types
    if (!document.startViewTransition) {
      router.push(href.toString());
      return;
    }

    // @ts-ignore
    document.startViewTransition(() => {
      router.push(href.toString());
    });
  };

  return (
    <Link href={href} {...props} onClick={handleTransition}>
      {children}
    </Link>
  );
}
