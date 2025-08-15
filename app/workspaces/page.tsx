"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { groupBy } from 'lodash'
import request from "@/lib/request";

type Workspace = {
  id: number;
  name: string;
  image: string;
  cpu: string;
  gpu: string;
  memory: string;
  storage: string;
  volumeMountPath: string;
  sshPort: number;
  codeServerPort: number;
  status: string;
  containerId: string;
};

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);

  const groupedImages = groupBy(images, img => img.RepoTags[0]?.split(':')[0])

  const reloadWorkspaces = () => {
    request("/api/workspaces")
      .then(data => setWorkspaces(data));
  };

  const fetchImages = () => {
    request("/api/images")
      .then(data => setImages(data));
  };

  useEffect(() => {
    reloadWorkspaces();
  }, []);

  useEffect(() => {
    if (open) {
      fetchImages()
    }
  }, [open]);

  const handleSubmit = async () => {
    await request("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setOpen(false);
    reloadWorkspaces();
  };

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>工作台列表</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">创建工作台</Button>
          </DialogTrigger>
          <DialogContent style={{ width: 640 }}>
            <DialogHeader>
              <DialogTitle>新建工作台</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Select onValueChange={(value) => setForm({ ...form, image: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择镜像" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(groupedImages).map(g => {
                    return (
                      <SelectGroup key={g}>
                        <SelectLabel>{g}</SelectLabel>
                        {groupedImages[g].map((image) => (
                          <SelectItem key={image.Id} value={image.Id}>
                            {image.RepoTags[0]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>
              <Input placeholder="名称" onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="CPU" onChange={e => setForm({ ...form, cpu: e.target.value })} />
              <Input placeholder="GPU" onChange={e => setForm({ ...form, gpu: e.target.value })} />
              <Input placeholder="内存" onChange={e => setForm({ ...form, memory: e.target.value })} />
              <Input placeholder="存储大小" onChange={e => setForm({ ...form, storage: e.target.value })} />
              <Input placeholder="卷路径" onChange={e => setForm({ ...form, volumeMountPath: e.target.value })} />
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
              <TableHead>镜像</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>GPU</TableHead>
              <TableHead>内存</TableHead>
              <TableHead>卷路径</TableHead>
              <TableHead>SSH端口</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-64 sticky right-0 bg-white z-10">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map(ws => (
              <TableRow key={ws.id}>
                <TableCell>{ws.name}</TableCell>
                <TableCell>{ws.image}</TableCell>
                <TableCell>{ws.cpu}</TableCell>
                <TableCell>{ws.gpu}</TableCell>
                <TableCell>{ws.memory}</TableCell>
                <TableCell>{ws.volumeMountPath}</TableCell>
                <TableCell>{ws.sshPort}</TableCell>
                <TableCell>{ws.status}</TableCell>
                <TableCell className="sticky right-0 bg-white z-10">
                  <div className="flex space-x-2">
                    {ws.status === 'created' ? (
                      <>
                        <Button size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/start`, { method: 'post' }).then(reloadWorkspaces)}>启动</Button>
                        <Button variant="destructive" size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/remove`, { method: 'post' }).then(reloadWorkspaces)}>删除</Button>
                      </>
                    ) : ws.status === 'running' ? (
                      <>
                        <Button size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/stop`, { method: 'post' }).then(reloadWorkspaces)}>停止</Button>
                        <Button variant="outline" size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/restart`, { method: 'post' }).then(reloadWorkspaces)}>重启</Button>
                        {/* <Button variant="outline" size="sm" onClick={() => { window.open(`/vscode/${ws.name}/vscode`, "_blank") }}>vscode</Button> */}
                        <Button variant="outline" size="sm" onClick={() => { window.open(`//${window.location.hostname}:${ws.codeServerPort}`, "_blank") }}>code server</Button>
                      </>
                    ) : ws.status === 'exited' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/start`, { method: 'post' }).then(reloadWorkspaces)}>启动</Button>
                        <Button variant="destructive" size="sm" onClick={() => fetch(`/api/workspaces/${ws.id}/remove`, { method: 'post' }).then(reloadWorkspaces)}>删除</Button>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
