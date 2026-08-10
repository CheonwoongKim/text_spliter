import Link from "next/link";

interface AuthPageProps {
  title: string;
  children: React.ReactNode;
}

interface AuthPageLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthPage({ title, children }: AuthPageProps) {
  return (
    <main lang="en" className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-auth">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-card-foreground">{title}</h1>
        </header>
        {children}
      </div>
    </main>
  );
}

export function AuthPageLink({ href, children, className = "mt-12" }: AuthPageLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`${className} block w-full text-center text-xs text-muted-foreground transition-smooth hover:text-card-foreground`}
    >
      {children}
    </Link>
  );
}
