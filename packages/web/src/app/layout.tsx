import "@/app/globals.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const metadata = {
  title: "Docker Workspace Manager",
  description: "Manage Workspaces with Docker",
};

const navLinks = [
  { href: "/workspaces", label: "工作台" },
  { href: "/storages", label: "存储" },
  { href: "/trainings", label: "训练" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <header className="bg-white border-b shadow-sm flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-primary">🌸 Docker Workspace Manager</span>
            <nav className="hidden md:flex gap-4 text-sm text-muted-foreground">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-muted-foreground hover:text-primary dark:hover:text-primary-foreground",
                    "text-sm font-medium transition-colors duration-200",
                    false ? "text-primary dark:text-primary-foreground font-semibold" : ""
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs text-muted-foreground">Administrator</div>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://i.pravatar.cc/40?img=1" alt="James" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="p-4 mx-auto">{children}</main>
      </body>
    </html>
  );
}
