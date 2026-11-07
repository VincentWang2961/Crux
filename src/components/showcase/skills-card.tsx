import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { proficiency, skillGroups } from "@/lib/site-data";

export function SkillsCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>技能 Skills</CardTitle>
        <CardDescription>常用技术栈与熟练度</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {skillGroups.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">{group.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        <Separator />
        <div className="flex flex-col gap-3">
          {proficiency.map((p) => (
            <Progress key={p.name} value={p.value}>
              <ProgressLabel>{p.name}</ProgressLabel>
              <ProgressValue />
            </Progress>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
