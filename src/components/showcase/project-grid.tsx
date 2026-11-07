import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { projects } from "@/lib/site-data";

export function ProjectGrid() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">项目 Projects</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="group">
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-1">
                  {p.name}
                  <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardAction>
                  <Badge variant={p.status === "进行中" ? "default" : "secondary"}>{p.status}</Badge>
                </CardAction>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </CardFooter>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
