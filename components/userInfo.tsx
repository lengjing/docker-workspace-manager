"use client";

import { useLayoutEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserInfo() {
  const [user, setUser] = useState<{ username: string; avatar: string } | null>(null);

  useLayoutEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  if (!user) {
    return <a href="/login" className="text-sm text-primary">登录</a>;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">{user.username}</div>
          {/* <div className="text-xs text-muted-foreground">Administrator</div> */}
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://i.pravatar.cc/40?img=1" alt="" />
          <AvatarFallback>{user.username[0]}</AvatarFallback>
        </Avatar>
      </div>
    </>
  );
}
