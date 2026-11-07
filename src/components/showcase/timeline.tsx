import { Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { education, experience, type TimelineItem } from "@/lib/site-data";

function TimelineList({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative ml-2 border-l pl-6">
      {items.map((item) => (
        <li key={item.role + item.org} className="relative pb-6 last:pb-0">
          <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h3 className="font-medium">{item.role}</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{item.period}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.org}</p>
          <p className="mt-1 text-sm leading-relaxed">{item.description}</p>
          {item.tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Timeline() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>经历 Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="work">
          <TabsList>
            <TabsTrigger value="work">
              <Briefcase />
              工作
            </TabsTrigger>
            <TabsTrigger value="edu">
              <GraduationCap />
              教育
            </TabsTrigger>
          </TabsList>
          <TabsContent value="work" className="pt-4">
            <TimelineList items={experience} />
          </TabsContent>
          <TabsContent value="edu" className="pt-4">
            <TimelineList items={education} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
