import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { 
  LayoutDashboard, Users, FileText, Mail, Map, 
  Megaphone, Edit3, Link as LinkIcon, BarChart3, 
  Settings, LogOut, Menu, X 
} from "lucide-react";
import { useState, useEffect } from "react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAdminAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && location !== "/admin/login") {
      setLocation("/admin/login");
    }
  }, [isLoading, user, location, setLocation]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (isLoading || (!user && location !== "/admin/login")) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (location === "/admin/login") {
    return <>{children}</>;
  }

  const menu = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: FileText, label: "Blog", href: "/admin/blog" },
    { icon: Mail, label: "Contact", href: "/admin/contact" },
    { icon: Map, label: "Roadmap", href: "/admin/roadmap" },
    { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
    { icon: Edit3, label: "Content", href: "/admin/content" },
    { icon: LinkIcon, label: "Social Links", href: "/admin/social-links" },
    { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/10 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">H</div>
              <span className="font-heading font-bold text-xl text-white">Admin</span>
            </div>
            <button className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menu.map((item) => {
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between px-4 lg:px-8">
          <button className="lg:hidden text-white" onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">Logged in as <strong className="text-white">{user?.firstName}</strong></span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-black p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
