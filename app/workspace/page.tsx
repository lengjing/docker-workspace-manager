"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Workspace = {
  id: number;
  name: string;
  cpu: string;
  gpu: string;
  memory: string;
  storage: string;
  volumeMountPath: string;
  sshPort: number;
  status: string;
};

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/workspace").then(res => res.json()).then(setWorkspaces);
  }, []);

  const handleSubmit = async () => {
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setOpen(false);
    fetch("/api/workspace").then(res => res.json()).then(setWorkspaces);
  };

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>工作台列表</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">创建工作台</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建工作台</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input placeholder="名称" onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="CPU" onChange={e => setForm({ ...form, cpu: e.target.value })} />
              <Input placeholder="GPU" onChange={e => setForm({ ...form, gpu: e.target.value })} />
              <Input placeholder="内存" onChange={e => setForm({ ...form, memory: e.target.value })} />
              <Input placeholder="存储大小" onChange={e => setForm({ ...form, storage: e.target.value })} />
              <Input placeholder="卷路径（已在存储里创建好）" onChange={e => setForm({ ...form, volumeMountPath: e.target.value })} />
              <Button onClick={handleSubmit}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <Separator />
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>GPU</TableHead>
              <TableHead>内存</TableHead>
              <TableHead>卷路径</TableHead>
              <TableHead>SSH端口</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map(ws => (
              <TableRow key={ws.id}>
                <TableCell>{ws.name}</TableCell>
                <TableCell>{ws.cpu}</TableCell>
                <TableCell>{ws.gpu}</TableCell>
                <TableCell>{ws.memory}</TableCell>
                <TableCell>{ws.volumeMountPath}</TableCell>
                <TableCell>{ws.sshPort}</TableCell>
                <TableCell>{ws.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
