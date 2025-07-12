"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Storage = {
  id: number;
  name: string;
  volumePath: string;
  size: string;
  createdAt: string;
};

export default function StoragePage() {
  const [storages, setStorages] = useState<Storage[]>([]);
  const [form, setForm] = useState<any>({});

  const fetchStorages = () => {
    fetch("/api/storage").then(res => res.json()).then(setStorages);
  };

  useEffect(() => {
    fetchStorages();
  }, []);

  const handleSubmit = async () => {
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    fetchStorages();
  };

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>存储列表</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="名称" onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="路径" onChange={e => setForm({ ...form, volumePath: e.target.value })} />
          <Input placeholder="大小" onChange={e => setForm({ ...form, size: e.target.value })} />
          <Button onClick={handleSubmit}>创建</Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storages.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.volumePath}</TableCell>
                <TableCell>{s.size}</TableCell>
                <TableCell>{s.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
