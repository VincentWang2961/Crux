import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { posts } from "@/lib/site-data";

export function PostList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最新文章 Recent Posts</CardTitle>
        <CardDescription>博客文章列表样式预览</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {posts.map((post, i) => (
          <div key={post.title}>
            {i > 0 && <Separator className="my-4" />}
            <article className="flex flex-col gap-1.5">
              <h3 className="font-medium hover:underline">
                <a href="#">{post.title}</a>
              </h3>
              <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 tabular-nums">
                  <Calendar className="size-3.5" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {post.readingTime}
                </span>
                {post.tags.map((t) => (
                  <Badge key={t} variant="ghost" className="px-1.5">
                    #{t}
                  </Badge>
                ))}
              </div>
            </article>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
