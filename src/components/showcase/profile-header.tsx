import { ArrowUpRight, Globe, Mail, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { profile } from "@/lib/site-data";
import { GithubIcon } from "./github-icon";

export function ProfileHeader() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-20 text-xl">
          <AvatarFallback>{profile.initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
            {profile.available && (
              <Badge variant="secondary">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                开放机会
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{profile.title}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {profile.location}
          </p>
          <p className="max-w-prose text-sm leading-relaxed">{profile.bio}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button nativeButton={false} render={<a href={`mailto:${profile.email}`} />}>
              <Mail />
              联系我
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={profile.links.github} target="_blank" rel="noreferrer" />}
            >
              <GithubIcon className="size-4" />
              GitHub
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<a href={profile.links.website} target="_blank" rel="noreferrer" />}
            >
              <Globe />
              Website
              <ArrowUpRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
