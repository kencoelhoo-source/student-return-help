import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Search, Plus, Bell, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Campus<span className="text-gradient-hero">Find</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/items">Browse Items</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/post">
                  <Plus className="mr-1 h-4 w-4" /> Report Item
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard?tab=notifications">
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b mb-1">
                    {user.user_metadata?.full_name || user.email || "Logged in"}
                  </div>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden animate-fade-in">
          <div className="flex flex-col gap-2">
            <Button variant="ghost" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/items">Browse Items</Link>
            </Button>
            {user ? (
              <>
                <Button asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/post"><Plus className="mr-1 h-4 w-4" /> Report Item</Link>
                </Button>
                <Button variant="ghost" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="ghost" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut className="mr-1 h-4 w-4" /> Sign Out
                </Button>
              </>
            ) : (
              <Button asChild onClick={() => setMobileOpen(false)}>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
