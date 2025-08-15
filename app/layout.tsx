import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner"
import { UserInfo } from "@/components/userInfo";

export const metadata = {
  title: "Docker Workspace Manager",
  description: "Manage Workspaces with Docker",
};

export default function RootLayout({ children }: {
  children: React.ReactNode;
}) {
  const shouldShowLayout = true;

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {shouldShowLayout && <header className="bg-white border-b shadow-sm flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold text-primary">🌸 Docker Workspace Manager</a>
            <nav className="hidden md:flex gap-4 text-sm text-muted-foreground">
              {/* <a href="#" className="hover:text-primary">Dashboard</a>
            <a href="#" className="hover:text-primary">Hosts</a>
            <a href="#" className="hover:text-primary">Access Lists</a>
            <a href="#" className="hover:text-primary">SSL Certificates</a>
            <a href="#" className="hover:text-primary">Users</a>
            <a href="#" className="hover:text-primary">Audit Log</a>
            <a href="#" className="hover:text-primary">Settings</a> */}
              <a href="/workspaces" className="hover:text-primary">工作台</a>
              <a href="/storages" className="hover:text-primary">存储</a>
              <a href="/trainings" className="hover:text-primary">训练</a>
            </nav>
          </div>
          {/* <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-muted-foreground">Administrator</div>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://i.pravatar.cc/40?img=1" alt="James" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </div> */}
          <UserInfo></UserInfo>
        </header>}
        <main className="p-4 mx-auto">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
